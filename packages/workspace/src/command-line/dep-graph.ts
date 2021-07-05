import { joinPathFragments } from '@nrwl/devkit/src/utils/path';
import { watch } from 'chokidar';
import { createHash } from 'crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'fs';
import { copySync, ensureDirSync } from 'fs-extra';
import * as http from 'http';
import ignore from 'ignore';
import * as open from 'open';
import { dirname, join, normalize, parse } from 'path';
import { performance } from 'perf_hooks';
import { URL } from 'url';
import { workspaceLayout } from '../core/file-utils';
import { defaultFileHasher } from '../core/hasher/file-hasher';
import {
  createProjectGraph,
  onlyWorkspaceProjects,
  ProjectGraph,
  ProjectGraphDependency,
  ProjectGraphNode,
} from '../core/project-graph';
import { appRootPath } from '../utilities/app-root';
import {
  cacheDirectory,
  readCacheDirectoryProperty,
} from '../utilities/cache-directory';
import { writeJsonFile } from '../utilities/fileutils';
import { output } from '../utilities/output';

export interface DepGraphClientProject {
  name: string;
  type: string;
  data: {
    tags: string[];
    root: string;
  };
}
export interface DepGraphClientResponse {
  hash: string;
  projects: DepGraphClientProject[];
  dependencies: Record<string, ProjectGraphDependency[]>;
  layout: { appsDir: string; libsDir: string };
  changes: {
    added: string[];
  };
  affected: string[];
  focus: string;
  groupByFolder: boolean;
  exclude: string[];
}

// maps file extention to MIME types
const mimeType = {
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.eot': 'appliaction/vnd.ms-fontobject',
  '.ttf': 'aplication/font-sfnt',
};

const nxDepsDir = cacheDirectory(
  appRootPath,
  readCacheDirectoryProperty(appRootPath)
);

function projectsToHtml(
  projects: ProjectGraphNode[],
  graph: ProjectGraph,
  affected: string[],
  focus: string,
  groupByFolder: boolean,
  exclude: string[],
  layout: { appsDir: string; libsDir: string },
  localMode: 'serve' | 'build',
  watchMode: boolean = false
) {
  let f = readFileSync(
    join(__dirname, '../core/dep-graph/index.html'),
    'utf-8'
  );

  f = f
    .replace(
      `window.projects = []`,
      `window.projects = ${JSON.stringify(projects)}`
    )
    .replace(`window.graph = {}`, `window.graph = ${JSON.stringify(graph)}`)
    .replace(
      `window.affected = []`,
      `window.affected = ${JSON.stringify(affected)}`
    )
    .replace(
      `window.groupByFolder = false`,
      `window.groupByFolder = ${!!groupByFolder}`
    )
    .replace(
      `window.exclude = []`,
      `window.exclude = ${JSON.stringify(exclude)}`
    )
    .replace(
      `window.workspaceLayout = null`,
      `window.workspaceLayout = ${JSON.stringify(layout)}`
    );

  if (focus) {
    f = f.replace(
      `window.focusedProject = null`,
      `window.focusedProject = '${focus}'`
    );
  }

  if (watchMode) {
    f = f.replace(`window.watch = false`, `window.watch = true`);
  }

  if (localMode === 'build') {
    currentDepGraphClientResponse = createDepGraphClientResponse();
    f = f.replace(
      `window.projectGraphResponse = null`,
      `window.projectGraphResponse = ${JSON.stringify(
        currentDepGraphClientResponse
      )}`
    );

    f = f.replace(`window.localMode = 'serve'`, `window.localMode = 'build'`);
  }

  return f;
}

function projectExists(projects: ProjectGraphNode[], projectToFind: string) {
  return (
    projects.find((project) => project.name === projectToFind) !== undefined
  );
}

function hasPath(
  graph: ProjectGraph,
  target: string,
  node: string,
  visited: string[]
) {
  if (target === node) return true;

  for (let d of graph.dependencies[node] || []) {
    if (visited.indexOf(d.target) > -1) continue;
    visited.push(d.target);
    if (hasPath(graph, target, d.target, visited)) return true;
  }
  return false;
}

function filterGraph(
  graph: ProjectGraph,
  focus: string,
  exclude: string[]
): ProjectGraph {
  let projectNames = (Object.values(graph.nodes) as ProjectGraphNode[]).map(
    (project) => project.name
  );

  let filteredProjectNames: Set<string>;

  if (focus !== null) {
    filteredProjectNames = new Set<string>();
    projectNames.forEach((p) => {
      const isInPath =
        hasPath(graph, p, focus, []) || hasPath(graph, focus, p, []);

      if (isInPath) {
        filteredProjectNames.add(p);
      }
    });
  } else {
    filteredProjectNames = new Set<string>(projectNames);
  }

  if (exclude.length !== 0) {
    exclude.forEach((p) => filteredProjectNames.delete(p));
  }

  let filteredGraph: ProjectGraph = {
    nodes: {},
    dependencies: {},
  };

  filteredProjectNames.forEach((p) => {
    filteredGraph.nodes[p] = graph.nodes[p];
    filteredGraph.dependencies[p] = graph.dependencies[p];
  });

  return filteredGraph;
}

export function generateGraph(
  args: {
    file?: string;
    host?: string;
    port?: number;
    focus?: string;
    exclude?: string[];
    groupByFolder?: boolean;
    watch?: boolean;
  },
  affectedProjects: string[]
): void {
  let graph = onlyWorkspaceProjects(createProjectGraph());
  const layout = workspaceLayout();

  const projects = Object.values(graph.nodes) as ProjectGraphNode[];
  projects.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  if (args.focus) {
    if (!projectExists(projects, args.focus)) {
      output.error({
        title: `Project to focus does not exist.`,
        bodyLines: [`You provided --focus=${args.focus}`],
      });
      process.exit(1);
    }
  }

  if (args.exclude) {
    const invalidExcludes: string[] = [];

    args.exclude.forEach((project) => {
      if (!projectExists(projects, project)) {
        invalidExcludes.push(project);
      }
    });

    if (invalidExcludes.length > 0) {
      output.error({
        title: `The following projects provided to --exclude do not exist:`,
        bodyLines: invalidExcludes,
      });
      process.exit(1);
    }
  }

  let html: string;

  if (!args.file || args.file.endsWith('html')) {
    html = projectsToHtml(
      projects,
      graph,
      affectedProjects,
      args.focus || null,
      args.groupByFolder || false,
      args.exclude || [],
      layout,
      !!args.file && args.file.endsWith('html') ? 'build' : 'serve',
      args.watch
    );
  } else {
    graph = filterGraph(graph, args.focus || null, args.exclude || []);
  }

  if (args.file) {
    let folder = appRootPath;
    let filename = args.file;
    let ext = args.file.replace(/^.*\.(.*)$/, '$1');

    if (ext === 'html') {
      if (filename.includes('/')) {
        const [_match, _folder, _file] = /^(.*)\/([^/]*\.(.*))$/.exec(
          args.file
        );
        folder = `${appRootPath}/${_folder}`;
        filename = _file;
      }
      filename = `${folder}/${filename}`;

      const assetsFolder = `${folder}/static`;
      const assets: string[] = [];
      copySync(join(__dirname, '../core/dep-graph'), assetsFolder, {
        filter: (_src, dest) => {
          const isntHtml = !/index\.html/.test(dest);
          if (isntHtml && dest.includes('.')) {
            assets.push(dest);
          }
          return isntHtml;
        },
      });

      currentDepGraphClientResponse = createDepGraphClientResponse();

      html = html.replace(/src="/g, 'src="static/');
      html = html.replace(/href="styles/g, 'href="static/styles');
      html = html.replace('<base href="/">', '');
      html = html.replace(/type="module"/g, '');

      writeFileSync(filename, html);

      output.success({
        title: `HTML output created in ${folder}`,
        bodyLines: [filename, ...assets],
      });
    } else if (ext === 'json') {
      filename = `${folder}/${filename}`;

      ensureDirSync(dirname(filename));

      writeJsonFile(filename, {
        graph,
        affectedProjects,
        criticalPath: affectedProjects,
      });

      output.success({
        title: `JSON output created in ${folder}`,
        bodyLines: [filename],
      });
    } else {
      output.error({
        title: `Please specify a filename with either .json or .html extension.`,
        bodyLines: [`You provided --file=${args.file}`],
      });
      process.exit(1);
    }
  } else {
    startServer(
      html,
      args.host || '127.0.0.1',
      args.port || 4211,
      args.watch,
      affectedProjects,
      args.focus,
      args.groupByFolder,
      args.exclude
    );
  }
}

function startServer(
  html: string,
  host: string,
  port = 4211,
  watchForchanges = false,
  affected: string[] = [],
  focus: string = null,
  groupByFolder: boolean = false,
  exclude: string[] = []
) {
  if (watchForchanges) {
    startWatcher();
  }

  currentDepGraphClientResponse = createDepGraphClientResponse();
  currentDepGraphClientResponse.affected = affected;
  currentDepGraphClientResponse.focus = focus;
  currentDepGraphClientResponse.groupByFolder = groupByFolder;
  currentDepGraphClientResponse.exclude = exclude;

  const app = http.createServer((req, res) => {
    // parse URL
    const parsedUrl = new URL(req.url, `http://${host}:${port}`);
    // extract URL path
    // Avoid https://en.wikipedia.org/wiki/Directory_traversal_attack
    // e.g curl --path-as-is http://localhost:9000/../fileInDanger.txt
    // by limiting the path to current directory only
    const sanitizePath = normalize(parsedUrl.pathname).replace(
      /^(\.\.[\/\\])+/,
      ''
    );

    if (sanitizePath === '/projectGraph.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(currentDepGraphClientResponse));
      return;
    }

    if (sanitizePath === '/currentHash') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hash: currentDepGraphClientResponse.hash }));
      return;
    }

    let pathname = join(__dirname, '../core/dep-graph/', sanitizePath);

    if (!existsSync(pathname)) {
      // if the file is not found, return 404
      res.statusCode = 404;
      res.end(`File ${pathname} not found!`);
      return;
    }

    // if is a directory, then look for index.html
    if (statSync(pathname).isDirectory()) {
      // pathname += '/index.html';
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    try {
      const data = readFileSync(pathname);

      const ext = parse(pathname).ext;
      res.setHeader('Content-type', mimeType[ext] || 'text/plain');
      res.end(data);
    } catch (err) {
      res.statusCode = 500;
      res.end(`Error getting the file: ${err}.`);
    }
  });

  app.listen(port, host);

  output.note({
    title: `Dep graph started at http://${host}:${port}`,
  });

  open(`http://${host}:${port}`);
}

let currentDepGraphClientResponse: DepGraphClientResponse = {
  hash: null,
  projects: [],
  dependencies: {},
  layout: {
    appsDir: '',
    libsDir: '',
  },
  changes: {
    added: [],
  },
  affected: [],
  focus: null,
  groupByFolder: false,
  exclude: [],
};

function getIgnoredGlobs(root: string) {
  const ig = ignore();
  try {
    ig.add(readFileSync(`${root}/.gitignore`, 'utf-8'));
  } catch {}
  try {
    ig.add(readFileSync(`${root}/.nxignore`, 'utf-8'));
  } catch {}
  return ig;
}

function startWatcher() {
  createFileWatcher(appRootPath, () => {
    output.note({ title: 'Recalculating dependency graph...' });

    const newGraphClientResponse = createDepGraphClientResponse();

    if (newGraphClientResponse.hash !== currentDepGraphClientResponse.hash) {
      output.note({ title: 'Graph changes updated.' });

      currentDepGraphClientResponse = newGraphClientResponse;
    } else {
      output.note({ title: 'No graph changes found.' });
    }
  });
}

function debounce(fn: (...args) => void, time: number) {
  let timeout: NodeJS.Timeout;

  return (...args) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => fn(...args), time);
  };
}

function createFileWatcher(root: string, changeHandler: () => void) {
  const ignoredGlobs = getIgnoredGlobs(root);
  const layout = workspaceLayout();

  const watcher = watch(
    [
      joinPathFragments(layout.appsDir, '**'),
      joinPathFragments(layout.libsDir, '**'),
    ],
    {
      cwd: root,
      ignoreInitial: true,
    }
  );
  watcher.on(
    'all',
    debounce((event: string, path: string) => {
      if (ignoredGlobs.ignores(path)) return;
      changeHandler();
    }, 500)
  );
  return { close: () => watcher.close() };
}

function createDepGraphClientResponse(): DepGraphClientResponse {
  performance.mark('dep graph watch calculation:start');
  defaultFileHasher.clear();
  defaultFileHasher.init();

  let graph = onlyWorkspaceProjects(createProjectGraph());
  performance.mark('dep graph watch calculation:end');
  performance.mark('dep graph response generation:start');

  const layout = workspaceLayout();
  const projects: DepGraphClientProject[] = Object.values(graph.nodes).map(
    (project) => ({
      name: project.name,
      type: project.type,
      data: {
        tags: project.data.tags,
        root: project.data.root,
      },
    })
  );

  const dependencies = graph.dependencies;

  const hasher = createHash('sha256');
  hasher.update(JSON.stringify({ layout, projects, dependencies }));

  const hash = hasher.digest('hex');

  let added = [];

  if (
    currentDepGraphClientResponse.hash !== null &&
    hash !== currentDepGraphClientResponse.hash
  ) {
    added = projects
      .filter((project) => {
        const result = currentDepGraphClientResponse.projects.find(
          (previousProject) => previousProject.name === project.name
        );
        return !result;
      })
      .map((project) => project.name);
  }
  performance.mark('dep graph response generation:end');

  performance.measure(
    'dep graph watch calculation',
    'dep graph watch calculation:start',
    'dep graph watch calculation:end'
  );

  performance.measure(
    'dep graph response generation',
    'dep graph response generation:start',
    'dep graph response generation:end'
  );

  return {
    ...currentDepGraphClientResponse,
    hash,
    layout,
    projects,
    dependencies,
    changes: {
      added: [...currentDepGraphClientResponse.changes.added, ...added],
    },
  };
}

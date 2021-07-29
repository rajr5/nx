import { Tree } from '@nrwl/tao/src/shared/tree';
import { visitNotIgnoredFiles } from '../generators/visit-not-ignored-files';

export function moveFilesToNewDirectory(
  tree: Tree,
  oldDir: string,
  newDir: string
): void {
  visitNotIgnoredFiles(tree, oldDir, (file) => {
    try {
      tree.rename(file, file.replace(oldDir, newDir));
    } catch (e) {
      if (!tree.exists(oldDir)) {
        console.warn(`Path ${oldDir} does not exist`);
      } else if (!tree.exists(newDir)) {
        console.warn(`Path ${newDir} does not exist`);
      }
    }
  });
}

import { DocumentsApi } from './documents.api';
import type { DocumentMetadata } from './documents.models';
import { join } from 'path';
import fs from 'fs';

const archiveRootPath = join(
  process.env.WORKSPACE_ROOT,
  'nx-dev/nx-dev/public/documentation'
);
const documentsCache = new Map<string, DocumentMetadata[]>([
  ['latest', readJsonFile(join(archiveRootPath, 'latest', 'map.json'))],
  ['previous', readJsonFile(join(archiveRootPath, 'previous', 'map.json'))],
]);
const versionsData = readJsonFile(join(archiveRootPath, 'versions.json'));

function readJsonFile(f) {
  return JSON.parse(fs.readFileSync(f).toString());
}

describe('DocumentsApi', () => {
  const api = new DocumentsApi(versionsData, documentsCache);

  describe('getDocument', () => {
    it('should retrieve documents that exist', () => {
      const result = api.getDocument('latest', 'react', [
        'getting-started',
        'intro',
      ]);

      expect(result.filePath).toBeTruthy();
    });

    it('should throw error if segments do not match a file', () => {
      expect(() =>
        api.getDocument('latest', 'vue', ['does', 'not', 'exist'])
      ).toThrow();
    });
  });

  describe('getDocumentsRoot', () => {
    it('should support latest', () => {
      expect(api.getDocumentsRoot('latest')).toMatch(
        /nx-dev\/nx-dev\/public\/documentation\/latest/
      );
    });

    it('should support previous', () => {
      expect(api.getDocumentsRoot('previous')).toMatch(
        /nx-dev\/nx-dev\/public\/documentation\/previous/
      );
    });
  });

  describe('getVersions', () => {
    it('should return versions data', () => {
      expect(api.getVersions()).toEqual([
        expect.objectContaining({ id: 'latest' }),
        expect.objectContaining({ id: 'previous' }),
      ]);
    });
  });

  describe('getStaticDocumentPaths', () => {
    it.each`
      version       | flavor
      ${'latest'}   | ${'react'}
      ${'latest'}   | ${'angular'}
      ${'latest'}   | ${'node'}
      ${'previous'} | ${'react'}
      ${'previous'} | ${'angular'}
      ${'previous'} | ${'node'}
    `('should return paths for all flavors', ({ version, flavor }) => {
      const paths = api.getStaticDocumentPaths(version);
      const urls = paths.map((p) => p.params.segments.join('/'));

      expect(urls).toContainEqual(
        expect.stringMatching(`${version}/${flavor}/getting-started`)
      );
    });

    it('should return generic paths for the latest version', () => {
      const paths = api.getStaticDocumentPaths('latest');
      const urls = paths.map((p) => p.params.segments.join('/'));

      expect(urls).toContainEqual(expect.stringMatching(/^getting-started\//));
    });
  });
});

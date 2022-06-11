import { DocumentsApi } from '@nrwl/nx-dev/data-access-documents/node-only';
import { MenuApi } from '@nrwl/nx-dev/data-access-menu';
import { PackagesApi } from '@nrwl/nx-dev/data-access-packages/node-only';
import { DocumentMetadata } from '@nrwl/nx-dev/models-document';
import {
  getBasicNxCloudSection,
  getBasicSection,
  getDeepDiveNxCloudSection,
  getDeepDiveSection,
} from '../../data-access-menu/src/lib/menu.utils';

// Imports JSON directly, so they can be bundled into the app and functions.
// Also provides some test safety.
import documents from '../public/documentation/map.json';
import packages from '../public/documentation/packages.json';

export const packagesApi = new PackagesApi({
  publicPackagesRoot: 'nx-dev/nx-dev/public/documentation',
  packagesIndex: packages,
});

export const nxDocumentsApi = new DocumentsApi({
  publicDocsRoot: 'nx-dev/nx-dev/public/documentation',
  documentSources: [
    documents.find((x) => x.id === 'nx-documentation'),
    documents.find((x) => x.id === 'additional-api-references'),
  ].filter((x) => !!x) as DocumentMetadata[],
  addAncestor: null,
});

export const nxCloudDocumentsApi = new DocumentsApi({
  publicDocsRoot: 'nx-dev/nx-dev/public/documentation',
  documentSources: [
    documents.find((x) => x.id === 'nx-cloud-documentation'),
  ].filter((x) => !!x) as DocumentMetadata[],
  addAncestor: { id: 'nx-cloud', name: 'Nx Cloud' },
});

export const nxMenuApi = new MenuApi(
  nxDocumentsApi.getDocuments(),
  packagesApi.getPackageDocuments().itemList as DocumentMetadata[],
  [getBasicSection, getDeepDiveSection]
);

export const nxCloudMenuApi = new MenuApi(
  nxCloudDocumentsApi.getDocuments(),
  [],
  [getBasicNxCloudSection, getDeepDiveNxCloudSection]
);

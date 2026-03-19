import * as fs from 'fs';
import * as path from 'path';
import { CONFIG, TestCase, DatasetConfig } from '../config/config';
import { resolveImageFile } from './fileResolver';

/**
 * Load all datasets from the datasets directory
 * Filters by CONFIG.TEST_DATASETS if specified
 */
export async function loadAllDatasets(): Promise<DatasetConfig[]> {
  const datasetsDir = CONFIG.DATASETS_DIR;
  
  if (!fs.existsSync(datasetsDir)) {
    throw new Error(`Datasets directory not found: ${datasetsDir}`);
  }

  const datasets: DatasetConfig[] = [];
  let datasetFolders = fs.readdirSync(datasetsDir).filter(item => {
    const fullPath = path.join(datasetsDir, item);
    return fs.statSync(fullPath).isDirectory();
  });

  // Filter datasets if TEST_DATASETS is specified
  if (CONFIG.TEST_DATASETS && CONFIG.TEST_DATASETS.length > 0) {
    console.log(`📌 Filtering datasets: ${CONFIG.TEST_DATASETS.join(', ')}`);
    datasetFolders = datasetFolders.filter(folder => CONFIG.TEST_DATASETS!.includes(folder));
    
    if (datasetFolders.length === 0) {
      console.warn(`⚠️  Warning: No matching datasets found for filter: ${CONFIG.TEST_DATASETS.join(', ')}`);
    }
  }

  for (const folder of datasetFolders) {
    const datasetPath = path.join(datasetsDir, folder);
    const testcasesPath = path.join(datasetPath, 'testcases.json');

    if (fs.existsSync(testcasesPath)) {
      const testcasesContent = fs.readFileSync(testcasesPath, 'utf-8');
      const testcases: TestCase[] = JSON.parse(testcasesContent);

      // Validate that all images exist
      const imagesDir = path.join(datasetPath, 'images');
      for (const testcase of testcases) {
        const imagePath = path.join(imagesDir, testcase.image);
        if (!fs.existsSync(imagePath)) {
          console.warn(`⚠️  Warning: Image not found: ${imagePath}`);
        }
      }

      datasets.push({
        name: folder,
        path: datasetPath,
        testcases,
      });
    } else {
      console.warn(`⚠️  Warning: testcases.json not found in ${datasetPath}`);
    }
  }

  return datasets;
}

/**
 * Load a single dataset by name
 */
export async function loadDataset(datasetName: string): Promise<DatasetConfig> {
  const datasetPath = path.join(CONFIG.DATASETS_DIR, datasetName);
  const testcasesPath = path.join(datasetPath, 'testcases.json');

  if (!fs.existsSync(testcasesPath)) {
    throw new Error(`testcases.json not found for dataset: ${datasetName}`);
  }

  const testcasesContent = fs.readFileSync(testcasesPath, 'utf-8');
  const testcases: TestCase[] = JSON.parse(testcasesContent);

  return {
    name: datasetName,
    path: datasetPath,
    testcases,
  };
}

/**
 * Get the full path to an image file (with case-insensitive matching)
 */
export function getImagePath(datasetPath: string, imageName: string): string {
  return resolveImageFile(datasetPath, imageName);
}

/**
 * Validate testcase structure
 */
export function validateTestCase(testcase: TestCase): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!testcase.image) {
    errors.push('Missing required field: image');
  }

  if (!testcase.expected_query) {
    errors.push('Missing required field: expected_query');
  }

  if (!testcase.expected_response) {
    errors.push('Missing required field: expected_response');
  }

  if (!testcase.fact_check_link) {
    errors.push('Missing required field: fact_check_link');
  }

  if (!Array.isArray(testcase.keywords)) {
    errors.push('keywords must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

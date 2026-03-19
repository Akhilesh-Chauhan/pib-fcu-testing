import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve image file with case-insensitive matching
 * Supports: .jpg, .jpeg, .png
 */
export function resolveImageFile(datasetPath: string, imageName: string): string {
  const imagesDir = path.join(datasetPath, 'images');
  
  if (!fs.existsSync(imagesDir)) {
    throw new Error(`Images directory not found: ${imagesDir}`);
  }

  // Get all files in images directory
  const files = fs.readdirSync(imagesDir);
  
  // Try exact match first
  if (files.includes(imageName)) {
    const exactPath = path.join(imagesDir, imageName);
    console.log(`   ✓ Resolved (exact match): ${imageName}`);
    return exactPath;
  }

  // Try case-insensitive match
  const lowerImageName = imageName.toLowerCase();
  const matchedFile = files.find(file => file.toLowerCase() === lowerImageName);
  
  if (matchedFile) {
    const resolvedPath = path.join(imagesDir, matchedFile);
    console.log(`   ✓ Resolved (case-insensitive): ${imageName} → ${matchedFile}`);
    return resolvedPath;
  }

  // Try with extension variations
  const nameWithoutExt = path.parse(imageName).name.toLowerCase();
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
  
  for (const ext of supportedExtensions) {
    const testFile = files.find(file => {
      const fileParsed = path.parse(file);
      return fileParsed.name.toLowerCase() === nameWithoutExt && 
             fileParsed.ext.toLowerCase() === ext.toLowerCase();
    });
    
    if (testFile) {
      const resolvedPath = path.join(imagesDir, testFile);
      console.log(`   ✓ Resolved (extension match): ${imageName} → ${testFile}`);
      return resolvedPath;
    }
  }

  // File not found
  const error = new Error(`FILE_NOT_FOUND: Image not found: ${imageName} in ${imagesDir}`);
  error.name = 'FILE_NOT_FOUND';
  throw error;
}

/**
 * Validate that image file exists and is supported format
 */
export function validateImageFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const supportedFormats = ['.jpg', '.jpeg', '.png'];
  
  return supportedFormats.includes(ext);
}

/**
 * Get file extension (normalized to lowercase)
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * List all image files in a directory
 */
export function listImageFiles(imagesDir: string): string[] {
  if (!fs.existsSync(imagesDir)) {
    return [];
  }

  const files = fs.readdirSync(imagesDir);
  const supportedExtensions = ['.jpg', '.jpeg', '.png'];
  
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return supportedExtensions.includes(ext);
  });
}

export interface StorageProvider {
  upload(key: string, file: Buffer, contentType: string): Promise<{ key: string }>;
  delete(key: string): Promise<void>;
  getUrl(key: string, opts?: { expiresIn?: number }): string;
  list(prefix: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
}

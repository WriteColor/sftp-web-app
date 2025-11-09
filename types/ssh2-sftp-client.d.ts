declare module 'ssh2-sftp-client' {
  import { ConnectConfig } from 'ssh2'
  import { Readable, Writable } from 'stream'

  interface FileInfo {
    type: string
    name: string
    size: number
    modifyTime: number
    accessTime: number
    rights: {
      user: string
      group: string
      other: string
    }
    owner: number
    group: number
    longname: string
  }

  interface ConnectOptions extends ConnectConfig {
    host: string
    port?: number
    username: string
    password?: string
    privateKey?: string | Buffer
  }

  class SFTPClient {
    constructor()
    connect(config: ConnectOptions): Promise<void>
    end(): Promise<void>
    list(path: string): Promise<FileInfo[]>
    get(remotePath: string, dst?: string | Writable): Promise<string | Buffer>
    put(input: string | Buffer | Readable, remotePath: string): Promise<string>
    delete(remotePath: string): Promise<void>
    rename(fromPath: string, toPath: string): Promise<void>
    mkdir(remotePath: string, recursive?: boolean): Promise<void>
    rmdir(remotePath: string, recursive?: boolean): Promise<void>
    exists(remotePath: string): Promise<boolean | string>
    stat(remotePath: string): Promise<FileInfo>
  }

  export default SFTPClient
}

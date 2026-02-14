declare module 'find-free-port' {
  function findFreePort(start: number, end?: number): Promise<number[]>;
  export = findFreePort;
}

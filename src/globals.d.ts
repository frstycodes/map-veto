/// <reference types="vite/client" />

declare type Result<E extends Error, T> = [E, null] | [null, T]

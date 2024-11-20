export function getImageNameAndExtFromPath(path: string) {
  const parts = path.split('/')
  const filename = parts[parts.length - 1]
  const [name, ext] = filename.split('.')
  return { name, ext }
}

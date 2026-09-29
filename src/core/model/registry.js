

export function clearRegistry(registry) {
  registry.items.length = 0;
  registry.nextId = 1;
}

export function getRegistryItem(registry, id) {
  const item = registry.items.find(candidate => candidate.id === id);
  if (!item) throw new Error(registry.label + ' with id ' + id + ' not found.');
  return item;
}

export function listRegistryItems(registry, cloneItem) {
  return registry.items.map(cloneItem);
}

export function registerRegistryItem(registry, item, cloneItem) {
  item.id = registry.nextId++;
  registry.items.push(item);
  return cloneItem(item);
}

export function removeRegistryItem(registry, id) {
  const index = registry.items.findIndex(item => item.id === id);
  if (index === -1) return false;
  registry.items.splice(index, 1);
  return true;
}

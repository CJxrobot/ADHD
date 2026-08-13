// pcb-core/model.js
// Canonical PCB model + queries. Deliberately close to the original DATA shape
// ({components, nets, componentNets}) so the existing parsers barely change.
//
// Shape:
//   Component: { ref, footprint, value }
//   Net:       array of "REF.PIN" strings
//   Project:   { components: {ref: Component}, nets: {name: Net}, componentNets: {ref: string[]}, testPoints: {} }

export function createEmptyProject() {
  return { components: {}, nets: {}, componentNets: {}, testPoints: {} };
}

/** Derive componentNets from components/nets (same logic as the original parseNetlist()). */
export function deriveComponentNets(nets) {
  const componentNets = {};
  for (const [netName, pins] of Object.entries(nets)) {
    for (const pin of pins) {
      const ref = pin.split('.')[0];
      componentNets[ref] = componentNets[ref] || new Set();
      componentNets[ref].add(netName);
    }
  }
  const out = {};
  for (const ref of Object.keys(componentNets)) {
    out[ref] = Array.from(componentNets[ref]);
  }
  return out;
}

export function buildProject({ components, nets }) {
  return {
    components,
    nets,
    componentNets: deriveComponentNets(nets),
    testPoints: {}, // reserved — no UI/logic yet
  };
}

/** Case-insensitive-fallback resolver, same behavior as the original resolveRef(). */
export function resolveRef(name, table) {
  if (table[name] !== undefined) return name;
  const lower = name.toLowerCase();
  const found = Object.keys(table).find((k) => k.toLowerCase() === lower);
  return found || null;
}

export function findComponent(project, ref) {
  const resolved = resolveRef(ref, project.components);
  return resolved ? { ref: resolved, ...project.components[resolved] } : null;
}

export function findNet(project, name) {
  const resolved = resolveRef(name, project.nets);
  return resolved ? { name: resolved, pins: project.nets[resolved] } : null;
}

export function getNetsForComponent(project, ref) {
  const resolved = resolveRef(ref, project.components);
  if (!resolved) return [];
  return project.componentNets[resolved] || [];
}

export function getComponentsOnNet(project, netName) {
  const resolved = resolveRef(netName, project.nets);
  if (!resolved) return [];
  const refs = project.nets[resolved].map((p) => p.split('.')[0]);
  return Array.from(new Set(refs));
}

export function getConnectedComponents(project, ref) {
  const nets = getNetsForComponent(project, ref);
  const out = new Set();
  nets.forEach((netName) => {
    getComponentsOnNet(project, netName).forEach((r) => {
      if (r !== ref) out.add(r);
    });
  });
  return Array.from(out);
}

export function componentCount(project) {
  return Object.keys(project.components).length;
}

export function netCount(project) {
  return Object.keys(project.nets).length;
}

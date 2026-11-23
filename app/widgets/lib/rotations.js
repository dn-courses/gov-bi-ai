// rotations — the shapes a chain of n values passes through on its way to a balanced tree, one
// left rotation at a time (the Day–Stout–Warren method: the values arrived in order, so the tree
// starts as a chain leaning right).

// One shape: for each node (numbered in value order) its parent and its depth, and the level count.
function shape(root, left, right) {
  const parent = Array(left.length).fill(null), depth = Array(left.length).fill(0);
  let levels = 0;
  for (let level = [root]; level.length; levels++) {
    level = level.flatMap((node) => [left[node], right[node]].filter((child) => child !== null).map((child) => {
      parent[child] = node;
      depth[child] = depth[node] + 1;
      return child;
    }));
  }
  return { parent, depth, levels };
}

// states[0] is the chain; each next state is one rotation later; the last is balanced.
export function rotationStates(n) {
  const left = Array(n).fill(null), right = Array.from({ length: n }, (_, i) => (i + 1 < n ? i + 1 : null));
  let root = 0;
  const states = [shape(root, left, right)];
  // Walk down the right spine, lifting every second node above the one before it.
  const compress = (count) => {
    let above = null, node = root;
    for (let done = 0; done < count; done++) {
      const lifted = right[node];
      right[node] = left[lifted];
      left[lifted] = node;
      if (above === null) root = lifted; else right[above] = lifted;
      states.push(shape(root, left, right));
      above = lifted;
      node = right[lifted];
    }
  };
  let full = 2 ** Math.floor(Math.log2(n + 1)) - 1; // nodes of the largest full tree that fits
  compress(n - full);
  while (full > 1) { full = Math.floor(full / 2); compress(full); }
  return states;
}

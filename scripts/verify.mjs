// Self-check for the dsh-result-only-view bundle.
// Run with: npm run verify
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const requiredFiles = [
  "lib/index.js",
  "lib/client.js",
  "cordis.patch.yml",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
];
for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    throw new Error(`verify: missing required file ${file}`);
  }
}

for (const file of ["lib/index.js", "lib/client.js"]) {
  const res = spawnSync(process.execPath, ["--check", join(root, file)], { encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`verify: syntax check failed for ${file}:\n${res.stderr}`);
  }
}

const client = readFileSync(join(root, "lib/client.js"), "utf8");
const idMatch = client.match(/id:\s*"([^"]+)"/);
if (idMatch === null || idMatch[1] !== pkg.name) {
  throw new Error(
    `verify: client bundle id "${idMatch === null ? "?" : idMatch[1]}" does not match package name "${pkg.name}"`,
  );
}

const patch = readFileSync(join(root, "cordis.patch.yml"), "utf8");
if (!patch.includes(pkg.name)) {
  throw new Error(`verify: cordis.patch.yml does not reference package name "${pkg.name}"`);
}

// Smoke test: materialize the factory with stubs and run apply once.
let loaded = null;
const flowEl = {
  attrs: {},
  style: { setProperty() {}, removeProperty() {} },
  isConnected: true,
  getAttribute() {
    return null;
  },
  closest() {
    return null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  getClientRects() {
    return [{}];
  },
};
const sandbox = {
  window: {
    __ModuleLoader__: {
      load: (handoff) => {
        loaded = handoff;
      },
    },
    localStorage: {
      getItem: () => null,
      setItem() {},
    },
    setTimeout: (fn) => {
      fn();
      return 1;
    },
    clearTimeout() {},
    setInterval: () => 2,
    clearInterval() {},
    matchMedia: () => ({ matches: false }),
  },
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  document: {
    documentElement: {},
    head: { appendChild() {} },
    createElement: () => ({ dataset: {}, remove() {} }),
    querySelector: () => null,
    querySelectorAll: () => [flowEl],
  },
};
vm.createContext(sandbox);
vm.runInContext(client, sandbox);
if (loaded === null) {
  throw new Error("verify: bundle did not register itself through window.__ModuleLoader__");
}
const React = {
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  createElement: (type, props, ...children) => ({ type, props, children }),
};
const pluginExports = loaded.factory((name) => {
  if (name === "react") return React;
  throw new Error(`verify: unexpected require("${name}")`);
});
const ctx = {
  get: (name) => {
    if (name === "slots") {
      return {
        inject: (key, cb) => {
          cb();
          return () => {};
        },
        register: () => () => {},
      };
    }
    if (name === "locale") {
      return {
        register: () => () => {},
        bind: () => (key) => key,
      };
    }
    return undefined;
  },
  effect: (cb) => {
    const dispose = cb();
    return () => {
      if (typeof dispose === "function") dispose();
    };
  },
};
pluginExports.apply(ctx);

console.log(`verify OK — ${pkg.name}@${pkg.version}: files present, syntax valid, bundle id matches, apply smoke passed`);

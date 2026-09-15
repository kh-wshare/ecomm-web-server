/**
 * Structural checks on a generated collection, run as part of `docs:postman`.
 *
 * These catch the mistakes that are invisible until a suite is half-run:
 * an unresolvable `{{variable}}`, a body Postman cannot send, or a test script
 * that throws before it asserts anything.
 */

const DYNAMIC_VARIABLE = /^\$/;

function walk(items, trail, problems) {
  for (const item of items) {
    const path = `${trail} / ${item.name ?? '(unnamed)'}`;
    if (!item.name) problems.push(`Unnamed item under ${trail}`);
    if (Array.isArray(item.item)) {
      walk(item.item, path, problems);
      continue;
    }

    const request = item.request;
    if (!request) {
      problems.push(`No request: ${path}`);
      continue;
    }
    if (!request.method) problems.push(`No method: ${path}`);
    if (!request.url?.path?.length) problems.push(`No URL path: ${path}`);

    if (request.body?.mode === 'raw') {
      const raw = request.body.raw.replace(/\{\{[^}]+\}\}/g, 'PLACEHOLDER');
      try {
        JSON.parse(raw);
      } catch (error) {
        problems.push(`Body is not valid JSON: ${path} — ${error.message}`);
      }
      const hasContentType = (request.header ?? []).some(
        (header) => header.key.toLowerCase() === 'content-type',
      );
      if (!hasContentType) problems.push(`No Content-Type: ${path}`);
    }

    for (const event of item.event ?? []) {
      const exec = event.script?.exec;
      if (
        !Array.isArray(exec) ||
        exec.some((line) => typeof line !== 'string')
      ) {
        problems.push(`Script is not an array of strings: ${path}`);
        continue;
      }
      const source = exec.join('\n');
      try {
        new Function(source);
      } catch (error) {
        problems.push(`Script does not parse: ${path} — ${error.message}`);
      }
      // A helper that calls itself would recurse until the sandbox gives up.
      if (
        /const setVar = [^]*?\bsetVar\(/.test(
          source.split('\n').slice(0, 6).join('\n'),
        )
      ) {
        problems.push(`setVar helper is recursive: ${path}`);
      }
    }
  }
}

function validateCollection(collection, label) {
  const problems = [];
  if (!collection.info?.schema) problems.push(`${label}: no info.schema`);
  walk(collection.item, label, problems);

  const declared = new Set((collection.variable ?? []).map((v) => v.key));
  const referenced = new Set();
  JSON.stringify(collection).replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, name) => {
    referenced.add(name);
    return '';
  });
  for (const name of referenced) {
    if (declared.has(name) || DYNAMIC_VARIABLE.test(name)) continue;
    problems.push(`${label}: {{${name}}} is used but never declared`);
  }

  return problems;
}

module.exports = { validateCollection };

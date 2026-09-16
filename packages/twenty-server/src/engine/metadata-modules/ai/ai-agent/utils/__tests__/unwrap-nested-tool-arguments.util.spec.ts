import { unwrapNestedToolArguments } from 'src/engine/metadata-modules/ai/ai-agent/utils/unwrap-nested-tool-arguments.util';

describe('unwrapNestedToolArguments', () => {
  it('unwraps a single arguments wrapper', () => {
    expect(
      unwrapNestedToolArguments({
        arguments: { questions: [{ header: 'h' }] },
      }),
    ).toEqual({ questions: [{ header: 'h' }] });
  });

  it('unwraps input / parameters / args wrappers', () => {
    expect(unwrapNestedToolArguments({ input: { a: 1 } })).toEqual({ a: 1 });
    expect(unwrapNestedToolArguments({ parameters: { a: 1 } })).toEqual({
      a: 1,
    });
    expect(unwrapNestedToolArguments({ args: { a: 1 } })).toEqual({ a: 1 });
  });

  it('leaves already-flat payloads unchanged', () => {
    const payload = { questions: [{ header: 'h' }] };

    expect(unwrapNestedToolArguments(payload)).toBe(payload);
  });

  it('leaves multi-key objects unchanged', () => {
    const payload = { arguments: { a: 1 }, extra: true };

    expect(unwrapNestedToolArguments(payload)).toBe(payload);
  });
});

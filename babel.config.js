module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    plugins: [
      'react-native-reanimated/plugin',
      // Supabase v2 uses import.meta which Metro CJS bundler doesn't support.
      // This inline transform replaces import.meta with { url: '' } so the
      // bundle compiles cleanly on web.
      ({ types: t }) => ({
        visitor: {
          MetaProperty(path) {
            if (
              path.node.meta.name === 'import' &&
              path.node.property.name === 'meta'
            ) {
              path.replaceWith(
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('url'),
                    t.stringLiteral('')
                  ),
                ])
              );
            }
          },
        },
      }),
    ],
  };
};

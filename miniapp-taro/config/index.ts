import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import path from 'path'
import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig<'vite'>(async (merge) => {
  const defaultApiBase =
    process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:5000/api/v1'
      : 'https://example.invalid/api/v1'

  const miniConfig = {
    viteConfig: {
      css: {
        preprocessorOptions: {
          scss: {
            quietDeps: true,
          },
        },
      },
      build: {
        commonjsOptions: {
          transformMixedEsModules: true,
        },
      },
    },
    postcss: {
      pxtransform: { enable: true, config: {} },
      cssModules: {
        enable: false,
        config: { namingPattern: 'module', generateScopedName: '[name]__[local]___[hash:base64:5]' },
      },
    },
    sassLoaderOption: {
      quietDeps: true,
      silenceDeprecations: ['legacy-js-api'],
    },
  }

  const base: UserConfigExport<'vite'> = {
    projectName: 'raoyouqu-miniapp',
    date: '2026-5-21',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: ['@tarojs/plugin-html'],
    defineConstants: {
      __API_BASE__: JSON.stringify(process.env.TARO_APP_API_BASE || defaultApiBase),
    },
    copy: {
      patterns: [{ from: 'src/assets/', to: 'dist/assets/' }],
      options: {},
    },
    framework: 'react',
    compiler: 'vite',
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
    },
    mini: miniConfig as any,
  }
  if (process.env.NODE_ENV === 'development') {
    return merge({}, base, devConfig)
  }
  return merge({}, base, prodConfig)
})

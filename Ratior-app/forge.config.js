const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'Ratior',
    productName: 'Ratior - 每日计划',
    appBundleId: 'com.ratior.app',
    appCategoryType: 'public.app-category.productivity',
    // icon: './assets/icon', // 如果有图标的话
    ignore: [
      /^\/src\/.*\.map$/,
      /node_modules\/.*\.(md|txt|yml|yaml)$/,
    ],
    extraResource: []
  },
  rebuildConfig: {},
  makers: [
    {
      // Windows 安装程序 (.exe)
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Ratior',
        authors: 'Justin0828',
        description: '简约优美的每日计划定制应用',
        // iconUrl: 'https://example.com/icon.ico', // 可选：远程图标
        // setupIcon: './assets/icon.ico', // 可选：本地图标
      },
    },
    {
      // macOS 压缩包 (.zip)
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      // macOS 安装程序 (.dmg)
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Ratior',
        title: 'Ratior - 每日计划',
        // icon: './assets/icon.icns', // 可选：macOS图标
        // background: './assets/dmg-background.png', // 可选：背景图
      },
    },
    {
      // Windows 免安装版 (.zip)
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
    },
    {
      // Linux Debian/Ubuntu (.deb)
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Justin0828',
          homepage: 'https://github.com/justin0828/ratior',
          description: '简约优美的每日计划定制应用',
          categories: ['Office', 'Utility'],
        }
      },
    },
    {
      // Linux RedHat/CentOS (.rpm)
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          license: 'MIT',
          homepage: 'https://github.com/justin0828/ratior',
          description: '简约优美的每日计划定制应用',
          categories: ['Office', 'Utility'],
        }
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

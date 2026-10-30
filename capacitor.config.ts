import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.muhammedomor.bookreader.pro',
  appName: 'BookReader',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-2569092084065154~4678762900',
      testingDevices: []
    }
  }
};

export default config;

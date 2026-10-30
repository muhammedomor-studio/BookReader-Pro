import { AdMob, AdOptions, InterstitialAdPluginEvents } from '@capacitor-community/admob';

export class AdMobManager {
  private static readonly INTERSTITIAL_ID = 'ca-app-pub-2569092084065154/7939351061';
  private static isPrepared = false;

  public static async initialize(): Promise<void> {
    try {
      await AdMob.initialize({
        initializeForTesting: false
      });
      this.registerListeners();
      await this.prepareInterstitial();
    } catch (err) {
      console.warn('AdMob init failed (running in pure web browser):', err);
    }
  }

  private static registerListeners(): void {
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      this.isPrepared = false;
      this.prepareInterstitial(); // পরবর্তী পড়ার সেশনের জন্য লোড রাখা
    });

    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err) => {
      console.error('AdMob Interstitial failed to load:', err);
      this.isPrepared = false;
    });
  }

  public static async prepareInterstitial(): Promise<void> {
    try {
      const options: AdOptions = {
        adId: this.INTERSTITIAL_ID
      };
      await AdMob.prepareInterstitial(options);
      this.isPrepared = true;
    } catch (err) {
      this.isPrepared = false;
    }
  }

  public static async showInterstitial(): Promise<void> {
    try {
      if (this.isPrepared) {
        await AdMob.showInterstitial();
      } else {
        await this.prepareInterstitial();
      }
    } catch (e) {
      console.warn('AdMob Bridge not reachable or blocked.');
    }
  }
}

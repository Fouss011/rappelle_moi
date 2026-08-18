import { NativeModule, requireNativeModule } from 'expo';

declare class DayaWidgetModule extends NativeModule<{}> {
  syncReminders(remindersJson: string): Promise<boolean>;
  clearReminders(): Promise<boolean>;
}

export default requireNativeModule<DayaWidgetModule>(
  'DayaWidget'
);

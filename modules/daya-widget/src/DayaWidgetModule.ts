import { NativeModule, requireNativeModule } from 'expo';

declare class DayaWidgetModule extends NativeModule<{}> {
  setNextReminder(
    title: string,
    date: string
  ): Promise<boolean>;

  clearNextReminder(): Promise<boolean>;
}

export default requireNativeModule<DayaWidgetModule>(
  'DayaWidget'
);
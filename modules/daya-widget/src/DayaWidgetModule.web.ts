import { registerWebModule, NativeModule } from 'expo';

class DayaWidgetModule extends NativeModule<{}> {}

export default registerWebModule(DayaWidgetModule, 'DayaWidgetModule');

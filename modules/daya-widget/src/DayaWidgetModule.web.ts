import { NativeModule, registerWebModule } from 'expo';

class DayaWidgetModule extends NativeModule<{}> {}

export default registerWebModule(DayaWidgetModule, 'DayaWidgetModule');

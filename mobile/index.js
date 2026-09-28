import 'expo-router/entry';
import { AppRegistry } from 'react-native';
import { AUTOMATION_TASK_NAME, runAutomationTask } from './src/automation/headlessTask';

// Background SMS/notification processing; runs without the UI (see modules/etracko-automation).
AppRegistry.registerHeadlessTask(AUTOMATION_TASK_NAME, () => runAutomationTask);

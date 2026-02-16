// Add imports
import AboutUsScreen from './screens/menu-pages/AboutUsScreen';
import AboutYouScreen from './screens/menu-pages/AboutYouScreen';
import QuotesScreen from './screens/menu-pages/QuotesScreen';
import SettingsScreen from './screens/menu-pages/SettingsScreen';
import LegalScreen from './screens/menu-pages/LegalScreen';
import ContactScreen from './screens/menu-pages/ContactScreen';

// Add screens (after Menu screen):
<Tab.Screen 
  name="AboutUs" 
  component={AboutUsScreen}
  options={{ tabBarButton: () => null }}
/>
<Tab.Screen 
  name="AboutYou" 
  component={AboutYouScreen}
  options={{ tabBarButton: () => null }}
/>
<Tab.Screen 
  name="Quotes" 
  component={QuotesScreen}
  options={{ tabBarButton: () => null }}
/>
<Tab.Screen 
  name="Settings" 
  component={SettingsScreen}
  options={{ tabBarButton: () => null }}
/>
<Tab.Screen 
  name="Legal" 
  component={LegalScreen}
  options={{ tabBarButton: () => null }}
/>
<Tab.Screen 
  name="Contact" 
  component={ContactScreen}
  options={{ tabBarButton: () => null }}
/>
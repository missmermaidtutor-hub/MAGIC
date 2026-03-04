import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';

export default function LegalScreen({ navigation }) {
  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.container} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Legal</Text>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Terms of Service</Text>

          <Text style={styles.sectionHeader}>1. Beta Program Disclosure</Text>
          <Text style={styles.text}>This Platform is offered as a limited beta release. Features may change, malfunction, or be discontinued without notice. Services are provided 'AS IS' and 'AS AVAILABLE'.</Text>

          <Text style={styles.sectionHeader}>2. Eligibility</Text>
          <Text style={styles.text}>Users must be at least 18 years old and legally capable of entering binding agreements. The Platform is not directed to minors.</Text>

          <Text style={styles.sectionHeader}>3. Subscriptions & In-App Purchases</Text>
          <Text style={styles.text}>Certain features require paid subscriptions that automatically renew unless cancelled prior to renewal.{'\n\n'}iOS purchases are processed through Apple App Store and subject to Apple billing terms.{'\n\n'}Android purchases are processed through Google Play and subject to Google billing terms.{'\n\n'}Refunds are governed by the respective app store policies.{'\n\n'}Pricing, renewal frequency, and cancellation instructions are clearly disclosed prior to purchase.</Text>

          <Text style={styles.sectionHeader}>4. Marketplace & Monetization</Text>
          <Text style={styles.text}>Users may sell or license artwork through the Platform. Users retain copyright ownership.{'\n\n'}Transaction fees and payment processing fees may apply as disclosed.{'\n\n'}Users are responsible for applicable federal, state, and local taxes.{'\n\n'}The Platform does not guarantee sales or buyer performance.</Text>

          <Text style={styles.sectionHeader}>5. NFT & Digital Asset Terms</Text>
          <Text style={styles.text}>Users must own necessary intellectual property rights before minting NFTs.{'\n\n'}NFT transfers ownership of the token only, unless otherwise specified.{'\n\n'}Blockchain transactions are irreversible. The Platform is not liable for digital wallet errors or volatility.{'\n\n'}Secondary resale royalties may be supported where technologically feasible.</Text>

          <Text style={styles.sectionHeader}>6. Intellectual Property & DMCA</Text>
          <Text style={styles.text}>Users grant a non-exclusive, worldwide license to host and display content for Platform operations.{'\n\n'}We comply with the Digital Millennium Copyright Act and may terminate repeat infringers.</Text>

          <Text style={styles.sectionHeader}>7. Limitation of Liability</Text>
          <Text style={styles.text}>To the fullest extent permitted by U.S. law, liability is limited to $100 or the amount paid in the past 12 months, whichever is greater.</Text>

          <Text style={styles.sectionHeader}>8. Arbitration & Class Action Waiver</Text>
          <Text style={styles.text}>Disputes are resolved through binding arbitration under the Federal Arbitration Act. Users waive class action participation unless prohibited by law.{'\n\n'}Users may opt out of arbitration within 30 days of account creation via written notice.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>

          <Text style={styles.sectionHeader}>1. Information Collected</Text>
          <Text style={styles.text}>We collect account details, user-generated content, payment information, IP address, device information, cookies, and analytics data.</Text>

          <Text style={styles.sectionHeader}>2. Use of Information</Text>
          <Text style={styles.text}>Information is used to operate services, process payments, improve functionality, communicate with users, enforce policies, and comply with legal obligations.</Text>

          <Text style={styles.sectionHeader}>3. State Privacy Rights (CCPA/CPRA)</Text>
          <Text style={styles.text}>California residents may request access, deletion, or correction of personal data. We do not sell personal data as defined by law.{'\n\n'}Residents of other states with privacy laws may exercise rights by contacting us.</Text>

          <Text style={styles.sectionHeader}>4. COPPA Compliance</Text>
          <Text style={styles.text}>The Platform is not intended for children under 13 and does not knowingly collect data from minors.</Text>

          <Text style={styles.sectionHeader}>5. Data Security & Retention</Text>
          <Text style={styles.text}>We implement reasonable administrative, technical, and physical safeguards. Data is retained only as necessary for legal and operational purposes.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Community Guidelines</Text>

          <Text style={styles.sectionHeader}>1. Respect & Conduct</Text>
          <Text style={styles.text}>Harassment, threats, discrimination, or hate speech are prohibited.</Text>

          <Text style={styles.sectionHeader}>2. Original Work</Text>
          <Text style={styles.text}>Users must post original or properly licensed artwork. Copyright infringement is prohibited.</Text>

          <Text style={styles.sectionHeader}>3. Prohibited Content</Text>
          <Text style={styles.text}>No illegal activity, explicit sexual content, violent extremism, impersonation, or fraudulent conduct.</Text>

          <Text style={styles.sectionHeader}>4. Reporting & Appeals</Text>
          <Text style={styles.text}>Users may report violations through in-app tools. Suspended users may appeal within 14 days.</Text>

          <Text style={styles.sectionHeader}>5. Enforcement</Text>
          <Text style={styles.text}>Violations may result in removal, suspension, termination, or reporting to authorities where required.</Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  content: { padding: 20 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 20 },
  backButton: { width: 44, height: 44, backgroundColor: 'rgba(24, 112, 162, 0.5)', borderRadius: 22, borderWidth: 2, borderColor: '#8E0DD3', justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#8E0DD3', fontWeight: 'bold' },
  backButtonPlaceholder: { width: 44 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#8E0DD3', textAlign: 'center', flex: 1 },
  card: { backgroundColor: 'rgba(24, 112, 162, 0.5)', borderWidth: 3, borderColor: '#8E0DD3', borderRadius: 12, padding: 20, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#061679', marginBottom: 10 },
  sectionHeader: { fontSize: 17, fontWeight: 'bold', color: '#061679', marginTop: 16, marginBottom: 6 },
  text: { fontSize: 16, color: '#061679', lineHeight: 24, marginBottom: 8 },
  hamburgerButton: { width: 44, height: 44, backgroundColor: '#050d61', borderRadius: 22, borderWidth: 2, borderColor: '#B8860B', justifyContent: 'center', alignItems: 'center' },
  hamburgerText: { fontSize: 24, color: '#8E0DD3', fontWeight: 'bold' },
});

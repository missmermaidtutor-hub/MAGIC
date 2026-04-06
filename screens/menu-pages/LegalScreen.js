import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import ThemedBackground from '../../components/ThemedBackground';
import { useTheme } from '../../context/ThemeContext';

export default function LegalScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <ThemedBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.header, { color: theme.text.heading }]}>Legal</Text>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.lastUpdated}>Last Updated: March 17, 2026</Text>

        {/* ── Terms of Service ── */}
        <View style={styles.card}>
          <Text style={styles.title}>Terms of Service</Text>

          <Text style={styles.sectionHeader}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>By creating an account, accessing, or using the MAGIC Tracker application ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the Platform. We reserve the right to update these Terms at any time. Continued use after changes constitutes acceptance of the revised Terms. We will notify users of material changes via in-app notice or email.</Text>

          <Text style={styles.sectionHeader}>2. Beta Program Disclosure</Text>
          <Text style={styles.text}>The Platform is currently offered as a limited beta release. Features, functionality, and content may change, be modified, or be discontinued at any time without prior notice. During the beta period, the Platform is provided on an "AS IS" and "AS AVAILABLE" basis. Beta users acknowledge that bugs, errors, data loss, and service interruptions may occur. Your participation in the beta program does not guarantee access to any future version of the Platform.</Text>

          <Text style={styles.sectionHeader}>3. Eligibility</Text>
          <Text style={styles.text}>You must be at least 18 years of age and legally capable of entering into binding agreements under applicable law. By using the Platform, you represent and warrant that you meet these requirements. The Platform is not directed to individuals under the age of 18. If we learn that a user is under 18, we will promptly terminate their account and delete associated data.</Text>

          <Text style={styles.sectionHeader}>4. Account Registration & Security</Text>
          <Text style={styles.text}>You must provide accurate, current, and complete information during registration and keep your account information up to date. You are solely responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these Terms, contain false information, or remain inactive for an extended period.</Text>

          <Text style={styles.sectionHeader}>5. Subscriptions & In-App Purchases</Text>
          <Text style={styles.text}>Certain features of the Platform may require paid subscriptions or one-time purchases. Subscriptions automatically renew at the end of each billing cycle unless cancelled prior to the renewal date.{'\n\n'}iOS purchases are processed through the Apple App Store and are subject to Apple's billing terms and conditions. Android purchases are processed through Google Play and are subject to Google's billing terms.{'\n\n'}Pricing, renewal frequency, trial periods, and cancellation instructions will be clearly disclosed prior to any purchase. Refund requests are governed by the policies of the respective app store through which the purchase was made. We do not process payments directly and cannot override app store refund decisions.</Text>

          <Text style={styles.sectionHeader}>6. User Content & Intellectual Property</Text>
          <Text style={styles.text}>You retain full ownership of all original content you create and upload to the Platform, including artwork, text, and other creative works ("User Content"). By uploading User Content, you grant us a non-exclusive, worldwide, royalty-free, sublicensable license to host, display, reproduce, and distribute your content solely for the purpose of operating, promoting, and improving the Platform.{'\n\n'}You represent and warrant that you own or have obtained all necessary rights, licenses, and permissions for any content you upload. You will not upload content that infringes upon the intellectual property rights of any third party.{'\n\n'}We do not claim ownership of your User Content and will not use it for purposes unrelated to Platform operations without your express consent.</Text>

          <Text style={styles.sectionHeader}>7. Marketplace & Monetization</Text>
          <Text style={styles.text}>The Platform may offer features that allow users to sell, license, or otherwise monetize their artwork. Users participating in marketplace features retain copyright ownership of their works and are responsible for setting prices and terms for their offerings.{'\n\n'}Transaction fees and payment processing fees may apply and will be disclosed prior to any sale. Users are solely responsible for reporting and remitting all applicable federal, state, and local taxes arising from sales conducted through the Platform.{'\n\n'}The Platform acts solely as a venue for transactions between users and does not guarantee the completion of any sale, the quality of any artwork, or the performance of any buyer or seller.</Text>

          <Text style={styles.sectionHeader}>8. DMCA Notice & Takedown</Text>
          <Text style={styles.text}>We respect the intellectual property rights of others and comply with the Digital Millennium Copyright Act ("DMCA"). If you believe that content on the Platform infringes your copyright, you may submit a written notice to our designated agent containing:{'\n\n'}(a) Identification of the copyrighted work claimed to have been infringed;{'\n'}(b) Identification of the material that is claimed to be infringing and its location on the Platform;{'\n'}(c) Your contact information including name, address, telephone number, and email;{'\n'}(d) A statement that you have a good faith belief that the use is not authorized;{'\n'}(e) A statement under penalty of perjury that the information in the notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner;{'\n'}(f) Your physical or electronic signature.{'\n\n'}We will investigate notices and take appropriate action, including removing infringing content and terminating the accounts of repeat infringers.</Text>

          <Text style={styles.sectionHeader}>9. Limitation of Liability & Disclaimers</Text>
          <Text style={styles.text}>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE PLATFORM AND ITS OPERATORS, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING FROM YOUR ACCESS TO OR USE OF THE PLATFORM.{'\n\n'}IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY EXCEED THE GREATER OF ONE HUNDRED DOLLARS ($100) OR THE TOTAL AMOUNT YOU HAVE PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.{'\n\n'}THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</Text>

          <Text style={styles.sectionHeader}>10. Arbitration, Governing Law & Class Action Waiver</Text>
          <Text style={styles.text}>These Terms are governed by the laws of the State of Florida, without regard to conflict of law principles. Any dispute, controversy, or claim arising out of or relating to these Terms or the Platform shall be resolved through binding individual arbitration administered under the rules of the American Arbitration Association and governed by the Federal Arbitration Act.{'\n\n'}YOU AGREE TO WAIVE YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION. This waiver does not apply where prohibited by applicable law.{'\n\n'}You may opt out of the arbitration agreement within thirty (30) days of creating your account by sending written notice to our contact email. If you opt out, disputes will be resolved in the state or federal courts located in the State of Florida.{'\n\n'}Nothing in this section prevents either party from seeking injunctive or equitable relief in a court of competent jurisdiction for claims related to intellectual property infringement or unauthorized access.</Text>
        </View>

        {/* ── Privacy Policy ── */}
        <View style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>

          <Text style={styles.sectionHeader}>1. Information We Collect</Text>
          <Text style={styles.text}>We collect the following categories of information when you use the Platform:{'\n\n'}Account Information: Your email address, username, pseudonym, password (stored as a cryptographic hash), and profile details such as biography, timezone, and location.{'\n\n'}Identity Verification Data: In connection with certain features, we may collect identity-related information such as your full legal name, former maiden names, aliases, or prior legal identities used for account verification or dispute resolution.{'\n\n'}User-Generated Content: Artwork, images, text, discussion messages, goals, journal entries, and any other content you create or upload through the Platform.{'\n\n'}Device & Technical Data: IP address, browser type, operating system, device identifiers, screen resolution, and referring URLs.{'\n\n'}Usage Data: Pages visited, features used, session duration, interactions with content, and in-app navigation patterns.{'\n\n'}Payment Information: When you make purchases, payment details are collected and processed by third-party payment processors (Apple App Store, Google Play). We do not store credit card numbers or banking details on our servers.</Text>

          <Text style={styles.sectionHeader}>2. How We Use Your Information</Text>
          <Text style={styles.text}>We use the information we collect for the following purposes:{'\n\n'}• To create and maintain your account and authenticate your identity{'\n'}• To operate, maintain, and improve Platform features and functionality{'\n'}• To process transactions and send related billing confirmations{'\n'}• To communicate with you about updates, security alerts, and support{'\n'}• To personalize your experience and deliver relevant content{'\n'}• To monitor and analyze usage trends and improve performance{'\n'}• To detect, prevent, and address fraud, abuse, and security issues{'\n'}• To enforce our Terms of Service and Community Guidelines{'\n'}• To comply with legal obligations and respond to lawful requests</Text>

          <Text style={styles.sectionHeader}>3. Information Sharing & Third Parties</Text>
          <Text style={styles.text}>We do not sell your personal information to third parties. We may share information in the following circumstances:{'\n\n'}Service Providers: We engage trusted third-party vendors to perform functions on our behalf, including cloud hosting (Google Firebase), analytics, and payment processing. These providers are contractually obligated to protect your data and use it only for specified purposes.{'\n\n'}Legal Compliance: We may disclose information if required to do so by law, regulation, legal process, or governmental request, or when we believe disclosure is necessary to protect our rights, your safety, or the safety of others.{'\n\n'}Business Transfers: In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of the transaction. We will notify users of any such change in ownership or control.{'\n\n'}With Your Consent: We may share information for other purposes when you provide explicit consent.</Text>

          <Text style={styles.sectionHeader}>4. Cookies, Analytics & Tracking</Text>
          <Text style={styles.text}>The Platform uses cookies and similar technologies to maintain session state, remember user preferences, and collect usage analytics. We use Firebase Analytics and our own in-app analytics system to understand how users interact with the Platform.{'\n\n'}Analytics data is aggregated and used to improve features and performance. Individual-level analytics data is accessible only to Platform administrators for operational purposes.{'\n\n'}You may disable cookies through your browser settings, but doing so may affect Platform functionality. The Platform does not currently respond to "Do Not Track" browser signals, as no uniform standard for such signals has been adopted.</Text>

          <Text style={styles.sectionHeader}>5. Data Security</Text>
          <Text style={styles.text}>We implement reasonable administrative, technical, and physical safeguards designed to protect your personal information from unauthorized access, disclosure, alteration, and destruction. These measures include encrypted data transmission (TLS/SSL), secure cloud infrastructure, access controls, and regular security reviews.{'\n\n'}However, no method of transmission over the internet or electronic storage is completely secure. We cannot guarantee absolute security and are not liable for unauthorized access resulting from circumstances beyond our reasonable control.</Text>

          <Text style={styles.sectionHeader}>6. Data Retention & Deletion</Text>
          <Text style={styles.text}>We retain your personal information only for as long as necessary to fulfill the purposes described in this Privacy Policy, or as required by law. When you delete your account, we will delete or anonymize your personal data within thirty (30) days, except where retention is required for legal compliance, dispute resolution, or fraud prevention.{'\n\n'}Certain data, such as anonymized analytics and content that has been shared publicly through the Community features, may persist in aggregated form after account deletion. Discussion messages you have sent will be retained for the continuity of conversations but will no longer be associated with an active account.</Text>

          <Text style={styles.sectionHeader}>7. State Privacy Rights (CCPA/CPRA/State Laws)</Text>
          <Text style={styles.text}>If you are a resident of California, Virginia, Colorado, Connecticut, Utah, or another state with applicable privacy legislation, you may have additional rights regarding your personal information:{'\n\n'}• Right to Know: You may request details about the categories and specific pieces of personal information we collect, the purposes for collection, and the categories of third parties with whom we share data.{'\n'}• Right to Delete: You may request deletion of your personal information, subject to certain legal exceptions.{'\n'}• Right to Correct: You may request correction of inaccurate personal information.{'\n'}• Right to Opt Out: You may opt out of the sale or sharing of personal information. We do not sell personal information as defined by applicable state laws.{'\n'}• Right to Non-Discrimination: We will not discriminate against you for exercising your privacy rights.{'\n\n'}To exercise any of these rights, contact us at the email address provided in the Platform. We will verify your identity before processing requests and respond within the timeframes required by applicable law.</Text>

          <Text style={styles.sectionHeader}>8. COPPA Compliance & Children's Privacy</Text>
          <Text style={styles.text}>The Platform is not intended for use by children under the age of thirteen (13). We do not knowingly collect, use, or disclose personal information from children under 13. If we become aware that we have inadvertently collected information from a child under 13, we will take immediate steps to delete that information from our servers.{'\n\n'}If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately so we can take appropriate action. We encourage parents and guardians to monitor their children's online activity and to help enforce this policy.</Text>
        </View>

        {/* ── Community Guidelines ── */}
        <View style={styles.card}>
          <Text style={styles.title}>Community Guidelines</Text>

          <Text style={styles.sectionHeader}>1. Respect & Conduct</Text>
          <Text style={styles.text}>MAGIC Tracker is a supportive creative community. All members are expected to treat each other with dignity, kindness, and respect. The following conduct is strictly prohibited:{'\n\n'}• Harassment, bullying, intimidation, or threats of any kind{'\n'}• Hate speech, discrimination, or derogatory language based on race, ethnicity, gender, sexual orientation, religion, disability, or any other protected characteristic{'\n'}• Doxxing, stalking, or sharing another person's private information without consent{'\n'}• Spam, unsolicited promotions, or disruptive behavior in discussion pods or community spaces</Text>

          <Text style={styles.sectionHeader}>2. Original Work & Attribution</Text>
          <Text style={styles.text}>The creative community thrives on originality and honesty. All artwork, images, and content you share must be your own original work or properly licensed and attributed. Tracing, copying, or claiming another artist's work as your own is a serious violation.{'\n\n'}If you incorporate elements inspired by others, provide clear attribution. When using AI-generated art tools, you must disclose AI involvement when sharing in community spaces. Respect the creative efforts of your fellow members.</Text>

          <Text style={styles.sectionHeader}>3. Prohibited Content</Text>
          <Text style={styles.text}>The following types of content are prohibited on the Platform:{'\n\n'}• Content that promotes or depicts illegal activity{'\n'}• Explicit sexual content, nudity, or pornographic material{'\n'}• Graphic violence, gore, or content glorifying violent extremism{'\n'}• Content that promotes self-harm, eating disorders, or substance abuse{'\n'}• Impersonation of other users, public figures, or Platform staff{'\n'}• Fraudulent schemes, scams, or deceptive practices{'\n'}• Malware, phishing links, or any attempt to compromise Platform security{'\n'}• Content that violates the intellectual property rights of others</Text>

          <Text style={styles.sectionHeader}>4. Reporting Violations</Text>
          <Text style={styles.text}>If you encounter content or behavior that violates these guidelines, please report it using the in-app reporting tools or by contacting us via email. Reports should include as much detail as possible, including the content in question and the username of the individual involved.{'\n\n'}All reports will be reviewed promptly and handled confidentially. We do not disclose the identity of reporters to the individuals being reported. False or malicious reporting intended to harass other users is itself a violation of these guidelines.</Text>

          <Text style={styles.sectionHeader}>5. Appeals Process</Text>
          <Text style={styles.text}>If your content is removed or your account is suspended, you have the right to appeal the decision. Appeals must be submitted within fourteen (14) days of the enforcement action by contacting us via email.{'\n\n'}Your appeal should include a clear explanation of why you believe the action was taken in error. Appeals are reviewed by a member of our team who was not involved in the original decision. You will receive a response within a reasonable timeframe, typically within seven (7) business days.</Text>

          <Text style={styles.sectionHeader}>6. Enforcement Actions</Text>
          <Text style={styles.text}>Violations of these Community Guidelines may result in one or more of the following actions, at our sole discretion:{'\n\n'}• Content removal or modification{'\n'}• Issuance of a formal warning{'\n'}• Temporary suspension of account privileges{'\n'}• Permanent termination of your account{'\n'}• Restriction from specific Platform features (e.g., discussion pods, community gallery){'\n'}• Reporting to law enforcement authorities where required by law or where there is an imminent threat to safety{'\n\n'}The severity of enforcement depends on the nature and frequency of the violation. Repeated or egregious violations will result in escalated consequences. We reserve the right to take any action we deem necessary to protect the safety and integrity of the community.</Text>
        </View>
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 20 },
  backButton: { width: 44, height: 44, backgroundColor: 'rgba(24, 112, 162, 0.5)', borderRadius: 22, borderWidth: 2, borderColor: '#8E0DD3', justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#8E0DD3', fontWeight: 'bold' },
  backButtonPlaceholder: { width: 44 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#8E0DD3', textAlign: 'center', flex: 1 },
  lastUpdated: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },
  card: { backgroundColor: 'rgba(24, 112, 162, 0.5)', borderWidth: 3, borderColor: '#8E0DD3', borderRadius: 12, padding: 20, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFD700', marginBottom: 10 },
  sectionHeader: { fontSize: 17, fontWeight: 'bold', color: '#E0E0E0', marginTop: 16, marginBottom: 6 },
  text: { fontSize: 16, color: '#ccc', lineHeight: 24, marginBottom: 8 },
  hamburgerButton: { width: 44, height: 44, backgroundColor: '#050d61', borderRadius: 22, borderWidth: 2, borderColor: '#B8860B', justifyContent: 'center', alignItems: 'center' },
  hamburgerText: { fontSize: 24, color: '#8E0DD3', fontWeight: 'bold' },
});

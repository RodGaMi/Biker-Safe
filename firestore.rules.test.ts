/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * return PERMISSION_DENIED under the hardened ruleset.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const dirtyDozenTests: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Sticker Creation',
    operation: 'create',
    path: '/stickers/nfc-1001',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      tagId: 'nfc-1001',
      ownerId: 'victim_uid_999',
      fullName: 'Miguel Angel Rojas',
      bloodType: 'O+',
      allergies: 'Penicilina',
      medicalConditions: 'Ninguna',
      emergencyContactName: 'Maria',
      emergencyContactPhone: '+52 55 1234 5678',
      motorcycleDetails: 'Yamaha MT-07',
      insuranceDetails: 'GNP',
      organDonor: true,
      isActive: true,
      accessPin: '',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Sticker Creation',
    operation: 'create',
    path: '/stickers/nfc-1001',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      tagId: 'nfc-1001',
      ownerId: 'user_1',
      fullName: 'Miguel Angel Rojas',
      bloodType: 'O+',
      allergies: 'Penicilina',
      medicalConditions: 'Ninguna',
      emergencyContactName: 'Maria',
      emergencyContactPhone: '+52 55 1234 5678',
      motorcycleDetails: 'Yamaha MT-07',
      insuranceDetails: 'GNP',
      organDonor: true,
      isActive: true,
      accessPin: '',
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write Attempt',
    operation: 'create',
    path: '/stickers/nfc-1001',
    auth: { uid: 'user_1', email: 'gami.rodrigo@gmail.com', email_verified: false },
    payload: {
      tagId: 'nfc-1001',
      ownerId: 'user_1',
      fullName: 'Miguel Angel Rojas',
      bloodType: 'O+',
      allergies: '',
      medicalConditions: '',
      emergencyContactName: 'Maria',
      emergencyContactPhone: '+52 55 1234 5678',
      motorcycleDetails: '',
      insuranceDetails: '',
      organDonor: false,
      isActive: true,
      accessPin: '',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Immortal Field Mutation (ownerId hijack on update)',
    operation: 'update',
    path: '/stickers/nfc-1001',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      ownerId: 'attacker_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/stickers/nfc-1001',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Value Poisoning on Blood Type Enum',
    operation: 'update',
    path: '/stickers/nfc-1001',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      bloodType: 'UNKNOWN_INVALID_ENUM',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Denial of Wallet Oversized String',
    operation: 'update',
    path: '/stickers/nfc-1001',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      medicalConditions: 'X'.repeat(5000),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Path Variable ID Poisoning',
    operation: 'create',
    path: '/stickers/invalid$id!with*spaces',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unauthorized PII Read (PII Blanket Test)',
    operation: 'get',
    path: '/users/victim_uid/private/info',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unauthorized Collection Scraping (Query Trust Test)',
    operation: 'list',
    path: '/stickers',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Orphaned Scan Log Creation (Master Gate Bypass)',
    operation: 'create',
    path: '/stickers/non_existent_tag/scans/scan_01',
    auth: { uid: 'responder_1', email: 'responder@example.com', email_verified: true },
    payload: {
      scanId: 'scan_01',
      tagId: 'non_existent_tag',
      stickerOwnerId: 'victim_uid',
      scannerUid: 'responder_1',
      scannerLabel: 'Paramedic Unit 4',
      scanMethod: 'NFC_TAG',
      locationNote: 'Km 24',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Audit Log Tampering',
    operation: 'update',
    path: '/stickers/nfc-1001/scans/scan_01',
    auth: { uid: 'responder_1', email: 'responder@example.com', email_verified: true },
    payload: {
      locationNote: 'Modified history',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];

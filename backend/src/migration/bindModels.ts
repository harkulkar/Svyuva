import type { Connection, Model } from 'mongoose';
import { universitySchema } from '../models/University.js';
import { instituteSchema } from '../models/Institute.js';
import { userSchema } from '../models/User.js';
import { studentSchema } from '../models/Student.js';
import { documentSchema } from '../models/Document.js';
import { insuranceEnrollmentSchema } from '../models/InsuranceEnrollment.js';
import { paymentSchema } from '../models/Payment.js';
import { reviewSchema } from '../models/Review.js';
import { ecardSchema } from '../models/ECard.js';
import { enrollmentSchema } from '../models/Enrollment.js';
import { notificationSchema } from '../models/Notification.js';
import { auditLogSchema } from '../models/AuditLog.js';
import { migrationIdMapSchema } from '../models/MigrationIdMap.js';
import { migrationRunSchema } from '../models/MigrationRun.js';
import { migrationIssueSchema } from '../models/MigrationIssue.js';

export type BoundModels = {
  University: Model<any>;
  Institute: Model<any>;
  User: Model<any>;
  Student: Model<any>;
  Document: Model<any>;
  InsuranceEnrollment: Model<any>;
  Payment: Model<any>;
  Review: Model<any>;
  ECard: Model<any>;
  Enrollment: Model<any>;
  Notification: Model<any>;
  AuditLog: Model<any>;
  MigrationIdMap: Model<any>;
  MigrationRun: Model<any>;
  MigrationIssue: Model<any>;
};

export function bindModels(connection: Connection): BoundModels {
  return {
    University: connection.model('University', universitySchema),
    Institute: connection.model('Institute', instituteSchema),
    User: connection.model('User', userSchema),
    Student: connection.model('Student', studentSchema),
    Document: connection.model('Document', documentSchema),
    InsuranceEnrollment: connection.model('InsuranceEnrollment', insuranceEnrollmentSchema),
    Payment: connection.model('Payment', paymentSchema),
    Review: connection.model('Review', reviewSchema),
    ECard: connection.model('ECard', ecardSchema),
    Enrollment: connection.model('Enrollment', enrollmentSchema),
    Notification: connection.model('Notification', notificationSchema),
    AuditLog: connection.model('AuditLog', auditLogSchema),
    MigrationIdMap: connection.model('MigrationIdMap', migrationIdMapSchema),
    MigrationRun: connection.model('MigrationRun', migrationRunSchema),
    MigrationIssue: connection.model('MigrationIssue', migrationIssueSchema)
  };
}

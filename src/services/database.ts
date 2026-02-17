import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
  type WhereFilterOp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

// Generic CRUD operations for Firestore

/**
 * Create a new document in a collection with auto-generated ID
 */
export const createDocument = async <T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Create or update a document with a specific ID
 */
export const setDocument = async <T extends DocumentData>(
  collectionName: string,
  documentId: string,
  data: T,
  merge = true
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: Timestamp.now(),
      },
      { merge }
    );
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get a single document by ID
 */
export const getDocument = async <T extends DocumentData>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as unknown as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get all documents from a collection
 */
export const getAllDocuments = async <T extends DocumentData>(
  collectionName: string
): Promise<T[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as T[];
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Query documents with filters
 */
export const queryDocuments = async <T extends DocumentData>(
  collectionName: string,
  filters: Array<{
    field: string;
    operator: WhereFilterOp;
    value: unknown;
  }> = [],
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'asc',
  limitCount?: number
): Promise<T[]> => {
  try {
    const constraints: QueryConstraint[] = [];

    // Add where clauses
    filters.forEach(({ field, operator, value }) => {
      constraints.push(where(field, operator, value));
    });

    // Add orderBy
    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection));
    }

    // Add limit
    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as T[];
  } catch (error) {
    console.error(`Error querying documents from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update a document
 */
export const updateDocument = async <T extends Partial<DocumentData>>(
  collectionName: string,
  documentId: string,
  data: T
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (
  collectionName: string,
  documentId: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

// Batch operations helper
export const batchUpdate = async (
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    id?: string;
    data?: DocumentData;
  }>
): Promise<void> => {
  try {
    const promises = operations.map((op) => {
      switch (op.type) {
        case 'create':
          if (!op.data) throw new Error('Data is required for create operation');
          return createDocument(op.collection, op.data);
        case 'update':
          if (!op.id || !op.data) throw new Error('ID and data are required for update operation');
          return updateDocument(op.collection, op.id, op.data);
        case 'delete':
          if (!op.id) throw new Error('ID is required for delete operation');
          return deleteDocument(op.collection, op.id);
        default:
          throw new Error(`Unknown operation type: ${(op as { type: string }).type}`);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
};

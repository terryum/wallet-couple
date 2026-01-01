import { useCallback, useMemo, useState } from 'react';
import type { Category, Owner, Transaction } from '@/types';

type TransactionFieldChanges = {
  merchant?: { old: string; new: string };
  category?: { old: Category; new: Category };
};

interface UseTransactionEditFlowOptions {
  owner?: Owner;
  onEditClose?: () => void;
  openSimilarDelayMs?: number;
  enableSimilarModal?: boolean;
  onFieldsChanged?: (transaction: Transaction, changes: TransactionFieldChanges) => void;
  modalIdBase?: string;
  editModalId?: string;
  similarModalId?: string;
}

export function useTransactionEditFlow({
  owner,
  onEditClose,
  openSimilarDelayMs = 0,
  enableSimilarModal = true,
  onFieldsChanged,
  modalIdBase,
  editModalId,
  similarModalId,
}: UseTransactionEditFlowOptions = {}) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [similarModalOpen, setSimilarModalOpen] = useState(false);
  const [changedTransaction, setChangedTransaction] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState<Category | null>(null);
  const [newMerchantName, setNewMerchantName] = useState<string | null>(null);

  const openEdit = useCallback((transaction: Transaction | null) => {
    setSelectedTransaction(transaction);
    setEditModalOpen(true);
  }, []);

  const handleEditModalChange = useCallback(
    (open: boolean) => {
      setEditModalOpen(open);
      if (!open && onEditClose) {
        onEditClose();
      }
    },
    [onEditClose]
  );

  const handleFieldsChanged = useCallback(
    (transaction: Transaction, changes: TransactionFieldChanges) => {
      if (onFieldsChanged) {
        onFieldsChanged(transaction, changes);
      }

      const originalTx = { ...transaction };
      if (changes.merchant) {
        originalTx.merchant_name = changes.merchant.old;
      }
      if (changes.category) {
        originalTx.category = changes.category.old;
      }

      setChangedTransaction(originalTx);
      setNewMerchantName(changes.merchant?.new || null);
      setNewCategory(changes.category?.new || null);

      if (!enableSimilarModal) return;

      if (openSimilarDelayMs > 0) {
        setTimeout(() => {
          setSimilarModalOpen(true);
        }, openSimilarDelayMs);
      } else {
        setSimilarModalOpen(true);
      }
    },
    [enableSimilarModal, openSimilarDelayMs, onFieldsChanged]
  );

  const resolvedEditModalId = useMemo(() => {
    if (editModalId) return editModalId;
    if (modalIdBase) return `${modalIdBase}-edit`;
    return 'edit-modal';
  }, [editModalId, modalIdBase]);

  const resolvedSimilarModalId = useMemo(() => {
    if (similarModalId) return similarModalId;
    if (modalIdBase) return `${modalIdBase}-similar`;
    return 'similar-transactions-modal';
  }, [similarModalId, modalIdBase]);

  const editModalProps = useMemo(
    () => ({
      open: editModalOpen,
      onOpenChange: handleEditModalChange,
      transaction: selectedTransaction,
      owner,
      modalId: resolvedEditModalId,
      onFieldsChanged: enableSimilarModal ? handleFieldsChanged : undefined,
    }),
    [
      editModalOpen,
      handleEditModalChange,
      selectedTransaction,
      owner,
      resolvedEditModalId,
      enableSimilarModal,
      handleFieldsChanged,
    ]
  );

  const similarModalProps = useMemo(() => {
    if (!enableSimilarModal) return null;
    return {
      open: similarModalOpen,
      onOpenChange: setSimilarModalOpen,
      originalTransaction: changedTransaction,
      modalId: resolvedSimilarModalId,
      newCategory,
      newMerchantName,
    };
  }, [
    enableSimilarModal,
    similarModalOpen,
    changedTransaction,
    resolvedSimilarModalId,
    newCategory,
    newMerchantName,
  ]);

  const isSubModalOpen = editModalOpen || (enableSimilarModal && similarModalOpen);

  return {
    editModalOpen,
    selectedTransaction,
    openEdit,
    editModalProps,
    similarModalProps,
    isSubModalOpen,
  };
}

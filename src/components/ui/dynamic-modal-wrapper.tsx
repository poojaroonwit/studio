"use client"

import React, { useEffect, useRef, useState } from 'react';
import { zIndexManager, ModalType } from '@/lib/z-index-manager';

interface DynamicModalWrapperProps {
  children: React.ReactNode;
  modalType: ModalType;
  modalId?: string;
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * A wrapper component that automatically manages z-index for any modal/drawer component
 * This makes it easy to add dynamic z-index management to existing components
 */
export function DynamicModalWrapper({ 
  children, 
  modalType, 
  modalId, 
  isOpen, 
  onClose 
}: DynamicModalWrapperProps) {
  const [zIndex, setZIndex] = useState({ overlay: 10000, content: 10001 });
  const modalIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Generate or use provided modal ID
      const id = modalId || zIndexManager.generateId(modalType);
      modalIdRef.current = id;
      
      const { overlayZIndex, contentZIndex } = zIndexManager.registerModal(id, modalType);
      setZIndex({ overlay: overlayZIndex, content: contentZIndex });
      
      console.log(`[DynamicModalWrapper] ${modalType} opened with z-index ${overlayZIndex}/${contentZIndex}`);
    } else if (modalIdRef.current) {
      zIndexManager.unregisterModal(modalIdRef.current);
      modalIdRef.current = null;
      console.log(`[DynamicModalWrapper] ${modalType} closed and unregistered`);
    }
  }, [isOpen, modalType, modalId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modalIdRef.current) {
        zIndexManager.unregisterModal(modalIdRef.current);
      }
    };
  }, []);

  // Clone children and inject z-index styles
  const childrenWithZIndex = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        style: {
          ...child.props.style,
          zIndex: zIndex.content
        }
      });
    }
    return child;
  });

  return <>{childrenWithZIndex}</>;
}

/**
 * Hook for getting dynamic z-index values
 */
export function useDynamicZIndex(modalType: ModalType, isOpen: boolean, modalId?: string) {
  const [zIndex, setZIndex] = useState({ overlay: 10000, content: 10001 });
  const modalIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const id = modalId || zIndexManager.generateId(modalType);
      modalIdRef.current = id;
      
      const { overlayZIndex, contentZIndex } = zIndexManager.registerModal(id, modalType);
      setZIndex({ overlay: overlayZIndex, content: contentZIndex });
    } else if (modalIdRef.current) {
      zIndexManager.unregisterModal(modalIdRef.current);
      modalIdRef.current = null;
    }
  }, [isOpen, modalType, modalId]);

  useEffect(() => {
    return () => {
      if (modalIdRef.current) {
        zIndexManager.unregisterModal(modalIdRef.current);
      }
    };
  }, []);

  return zIndex;
}

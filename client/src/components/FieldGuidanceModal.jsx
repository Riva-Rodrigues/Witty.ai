import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FieldGuidanceModal({ isOpen, onClose, fieldName, guidance }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            How to fill: {fieldName}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 text-sm text-gray-600">
          {guidance}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const InfoIcon = ({ onClick }) => (
  <Button
    variant="ghost"
    size="sm"
    className="p-0 h-4 w-4 ml-2 hover:bg-transparent"
    onClick={onClick}
  >
    <Info className="h-4 w-4 text-gray-500 hover:text-gray-700" />
  </Button>
);
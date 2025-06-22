import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';

interface ColumnSelectionPanelProps {
  filledTemplateData: any[];
  selectedColumns: string[];
  onSelectedColumnsChange: (newSelectedColumns: string[]) => void;
  removeFirstRow: boolean;
  onRemoveFirstRowChange: (newValue: boolean) => void;
  isEnabled: boolean;
}

export const ColumnSelectionPanel: React.FC<ColumnSelectionPanelProps> = ({
  filledTemplateData,
  selectedColumns: selectedColumnsArray,
  onSelectedColumnsChange,
  removeFirstRow,
  onRemoveFirstRowChange,
  isEnabled,
}) => {
  const headers = useMemo(() => {
    if (!filledTemplateData || filledTemplateData.length === 0) {
      return [];
    }
    return Object.keys(filledTemplateData[0]);
  }, [filledTemplateData]);

  const selectedColumns = useMemo(() => new Set(selectedColumnsArray), [selectedColumnsArray]);

  const handleColumnToggle = (columnName: string) => {
    const newSelectedColumns = new Set(selectedColumns);
    if (newSelectedColumns.has(columnName)) {
      newSelectedColumns.delete(columnName);
    } else {
      newSelectedColumns.add(columnName);
    }
    onSelectedColumnsChange(Array.from(newSelectedColumns));
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure Final Output</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="remove-first-row"
              checked={removeFirstRow}
              onCheckedChange={onRemoveFirstRowChange}
            />
            <Label htmlFor="remove-first-row">Remove header row from output</Label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Select columns to include in the final output:</Label>
          <ScrollArea className="h-48 rounded-md border p-4">
            {headers.map(header => (
              <div key={header} className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id={header}
                  checked={selectedColumns.has(header)}
                  onCheckedChange={() => handleColumnToggle(header)}
                />
                <Label htmlFor={header} className="font-normal">
                  {header}
                </Label>
              </div>
            ))}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}; 
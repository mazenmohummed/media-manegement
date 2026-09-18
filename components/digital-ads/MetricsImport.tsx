// components/digital-ads/MetricsImport.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, FileUp, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ImportRow {
  date: string;
  reach: number;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  leads: number;
  engagement: number;
}

interface ImportResult {
  success: boolean;
  rowIndex: number;
  error?: string;
  data?: any;
  action?: 'created' | 'updated' | 'skipped';
}

interface MetricsImportProps {
  projectId: string;
  adId: string;
  onSuccess?: () => void;
}

export function MetricsImport({ projectId, adId, onSuccess }: MetricsImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [importResults, setImportResults] = useState<{
    results: ImportResult[];
    totalRows: number;
    successful: number;
    errors: number;
    hasErrors: boolean;
  } | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Parse rows
        const rows: ImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            if (header === 'date') {
              row[header] = values[index];
            } else {
              row[header] = parseFloat(values[index]) || 0;
            }
          });
          rows.push(row);
        }
        
        setPreviewRows(rows);
        toast.success(`Parsed ${rows.length} rows from CSV`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewRows.length === 0) {
      toast.error('No rows to import');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/digital-ads/${adId}/metrics/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: previewRows,
          skipDuplicates,
          updateExisting,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import metrics');
      }

      const data = await response.json();
      setImportResults(data);
      
      if (data.hasErrors) {
        toast.warning(data.message);
      } else {
        toast.success(data.message);
      }
      
      if (onSuccess && data.successful > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error importing metrics:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setPreviewRows([]);
    setImportResults(null);
    setSkipDuplicates(false);
    setUpdateExisting(true);
    // Reset file input
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const getStatusBadge = (action?: string) => {
    switch (action) {
      case 'created':
        return <Badge className="bg-green-500">Created</Badge>;
      case 'updated':
        return <Badge className="bg-blue-500">Updated</Badge>;
      case 'skipped':
        return <Badge className="bg-yellow-500">Skipped</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Import Metrics from CSV</span>
          {importResults && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-500">✓ {importResults.successful}</span>
              {importResults.errors > 0 && (
                <span className="text-red-500">✗ {importResults.errors}</span>
              )}
              <span className="text-muted-foreground">Total: {importResults.totalRows}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!previewRows.length ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Upload a CSV file with daily metrics
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Required columns: date, reach, impressions, clicks, spend, conversions, revenue, leads, engagement
            </p>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="max-w-sm"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{previewRows.length} rows loaded</span>
                <Button variant="outline" size="sm" onClick={resetImport}>
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                  />
                  Skip duplicates
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    disabled={skipDuplicates}
                  />
                  Update existing
                </label>
                <Button onClick={handleImport} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import All'
                  )}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reach</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Spend</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Engagement</TableHead>
                    {importResults && <TableHead>Status</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, index) => {
                    const result = importResults?.results.find(r => r.rowIndex === index);
                    const isError = importResults?.results.find(r => r.rowIndex === index && !r.success);
                    
                    return (
                      <TableRow key={index} className={isError ? 'bg-red-50' : ''}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{format(new Date(row.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{row.reach}</TableCell>
                        <TableCell>{row.impressions}</TableCell>
                        <TableCell>{row.clicks}</TableCell>
                        <TableCell>${row.spend.toFixed(2)}</TableCell>
                        <TableCell>{row.conversions}</TableCell>
                        <TableCell>${row.revenue.toFixed(2)}</TableCell>
                        <TableCell>{row.leads}</TableCell>
                        <TableCell>{row.engagement}</TableCell>
                        {importResults && (
                          <TableCell>
                            {result?.success ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                {getStatusBadge(result.action)}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-500">
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs">{result?.error}</span>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {importResults?.hasErrors && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      {importResults.errors} row(s) had errors
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {importResults.successful} rows were imported successfully
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Database, 
  Copy, 
  ExternalLink,
  CheckCircle,
  FileText,
  Play,
  Settings,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { ManualCreditNoteMigration } from '@/components/ManualCreditNoteMigration';
import { ForceCreditNoteMigration } from '@/components/ForceCreditNoteMigration';
import { StockMovementsSetup } from '@/components/inventory/StockMovementsSetup';
import { StockMovementErrorGuide } from '@/components/credit-notes/StockMovementErrorGuide';

export function CreditNotesSetupGuide() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showStockMovementsSetup, setShowStockMovementsSetup] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-primary" />
            <span>Credit Notes Setup Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Database Setup Required</strong><br />
              The Credit Notes feature requires database tables and functions to be created. 
              Choose one of the setup methods below to get started.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manual">Manual Setup</TabsTrigger>
          <TabsTrigger value="automated">Automated Setup</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>What Will Be Created</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center">
                    <Database className="h-4 w-4 mr-2 text-primary" />
                    Database Tables
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><code>credit_notes</code> - Main credit note records</li>
                    <li><code>credit_note_items</code> - Individual line items</li>
                    <li><code>credit_note_allocations</code> - Credit applications to invoices</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    Functions & Features
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Automatic credit note numbering</li>
                    <li>Credit application to invoices</li>
                    <li>Inventory adjustment tracking</li>
                    <li>Financial calculations</li>
                  </ul>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Safe to Run Multiple Times</strong><br />
                  All SQL commands use <code>IF NOT EXISTS</code> clauses, making them safe to execute repeatedly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Choose Your Setup Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Database className="h-5 w-5 text-primary" />
                      <span>Manual Setup</span>
                      <Badge variant="outline" className="bg-primary/10 text-primary">Recommended</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Copy and paste SQL commands into your Supabase SQL Editor. 
                      Full control and transparency.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 mr-2 text-success" />
                        <span>Direct database access</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 mr-2 text-success" />
                        <span>See exactly what's being created</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 mr-2 text-success" />
                        <span>Works with all Supabase plans</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setActiveTab('manual')}
                      className="w-full"
                      variant="outline"
                    >
                      Use Manual Setup
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Play className="h-5 w-5 text-secondary" />
                      <span>Automated Setup</span>
                      <Badge variant="outline" className="bg-warning/10 text-warning">Limited</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Attempt to run the setup automatically. May have limitations 
                      depending on your Supabase configuration.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <AlertCircle className="h-4 w-4 mr-2 text-warning" />
                        <span>Requires RPC permissions</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <AlertCircle className="h-4 w-4 mr-2 text-warning" />
                        <span>May not work on all plans</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 mr-2 text-success" />
                        <span>Quick if it works</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setActiveTab('automated')}
                      className="w-full"
                      variant="outline"
                    >
                      Try Automated Setup
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <ManualCreditNoteMigration />
        </TabsContent>

        <TabsContent value="automated" className="space-y-4">
          <ForceCreditNoteMigration />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <StockMovementsSetup />
        </TabsContent>
      </Tabs>

      {/* Stock Movement Error Guide */}
      <StockMovementErrorGuide
        onSetupStockMovements={() => setActiveTab('inventory')}
      />
    </div>
  );
}

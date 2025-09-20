import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  Package, 
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';

interface StockMovementErrorGuideProps {
  onSetupStockMovements: () => void;
}

export function StockMovementErrorGuide({ onSetupStockMovements }: StockMovementErrorGuideProps) {
  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-warning">
          <Package className="h-5 w-5" />
          <span>Inventory Tracking Unavailable</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Stock Movements Table Missing</strong><br />
            Credit notes can be created, but inventory tracking is not available because 
            the stock_movements table is missing from your database.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium">What This Means:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li>Credit notes will be created successfully</li>
                <li>But inventory quantities won't be automatically updated</li>
                <li>You'll need to manually adjust stock levels</li>
                <li>No audit trail of inventory movements</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Package className="h-5 w-5 text-success mt-0.5" />
            <div>
              <h4 className="font-medium">Benefits of Setting Up Stock Movements:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                <li>Automatic inventory updates when credit notes affect stock</li>
                <li>Complete audit trail of all inventory movements</li>
                <li>Accurate stock reporting and analytics</li>
                <li>Integration with other inventory features</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-warning/20">
          <span className="text-sm text-muted-foreground">
            Optional: Set up inventory tracking for full functionality
          </span>
          
          <Button 
            onClick={onSetupStockMovements}
            variant="outline"
            className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
          >
            <Package className="h-4 w-4 mr-2" />
            Set Up Stock Movements
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

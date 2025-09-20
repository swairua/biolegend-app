import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  User, 
  Building, 
  AlertCircle,
  CheckCircle,
  Info,
  ArrowRight
} from 'lucide-react';

export const RLSTroubleshootingGuide = () => {
  return (
    <Card className="border-info/20 bg-info/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-info" />
          Understanding RLS (Row Level Security) Issues
        </CardTitle>
        <CardDescription>
          Learn what causes permission errors and how to fix them
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            RLS ensures users can only access data belonging to their company. 
            When it fails, it's usually due to missing or incorrect profile information.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium text-base">Common Issues & Solutions:</h4>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <User className="h-5 w-5 text-warning mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-sm">Missing User Profile</div>
                <div className="text-xs text-muted-foreground">
                  Your account exists but has no profile record in the system.
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Fix:</Badge>
                  <span className="text-xs">Click "Attempt To Fix" to create a profile automatically</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Building className="h-5 w-5 text-warning mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-sm">No Company Assignment</div>
                <div className="text-xs text-muted-foreground">
                  Your profile exists but isn't assigned to any company.
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Fix:</Badge>
                  <span className="text-xs">Contact admin to assign you to a company</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-sm">Company Mismatch</div>
                <div className="text-xs text-muted-foreground">
                  The proforma belongs to a different company than yours.
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Fix:</Badge>
                  <span className="text-xs">Request access or transfer to your company</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            What "Attempt To Fix" Does:
          </h4>
          <div className="text-xs space-y-1 text-muted-foreground">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3" />
              <span>Checks if your user profile exists</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3" />
              <span>Creates a profile if missing (with default company)</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3" />
              <span>Verifies company access permissions</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3" />
              <span>Tests update permissions</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3" />
              <span>Reports what was fixed and what still needs attention</span>
            </div>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Note:</strong> Some issues require administrator intervention (like company assignments or access transfers). 
            The fix tool will tell you exactly what needs manual attention.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

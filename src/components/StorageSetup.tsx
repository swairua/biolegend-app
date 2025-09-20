import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { HardDrive, CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
}

export default function StorageSetup() {
  const [buckets, setBuckets] = React.useState<StorageBucket[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const loadBuckets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        setError(error.message);
      } else {
        setBuckets(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage buckets');
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultBuckets = async () => {
    setIsCreating(true);
    try {
      const defaultBuckets = [
        { name: 'documents', public: false },
        { name: 'images', public: true },
        { name: 'exports', public: false }
      ];

      for (const bucket of defaultBuckets) {
        const { error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public
        });
        
        if (error && !error.message.includes('already exists')) {
          throw error;
        }
      }

      toast.success('Default storage buckets created successfully');
      await loadBuckets();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create buckets';
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  React.useEffect(() => {
    loadBuckets();
  }, []);

  const requiredBuckets = ['documents', 'images', 'exports'];
  const missingBuckets = requiredBuckets.filter(
    name => !buckets.some(bucket => bucket.name === name)
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Storage Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span>Total Buckets:</span>
              <Badge variant="outline">{buckets.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Badge variant={missingBuckets.length === 0 ? 'default' : 'destructive'}>
                {missingBuckets.length === 0 ? 'Complete' : 'Setup Required'}
              </Badge>
            </div>
          </div>

          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {missingBuckets.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Missing required buckets: {missingBuckets.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {missingBuckets.length === 0 && !error && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>All required storage buckets are configured</span>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium">Configured Buckets:</h4>
            {isLoading ? (
              <div>Loading buckets...</div>
            ) : buckets.length > 0 ? (
              <div className="space-y-1">
                {buckets.map((bucket) => (
                  <div key={bucket.id} className="flex items-center justify-between border rounded p-2">
                    <span className="font-medium">{bucket.name}</span>
                    <div className="flex gap-2">
                      <Badge variant={bucket.public ? 'secondary' : 'outline'}>
                        {bucket.public ? 'Public' : 'Private'}
                      </Badge>
                      <Badge variant="outline">
                        {requiredBuckets.includes(bucket.name) ? 'Required' : 'Custom'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No buckets found</div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={loadBuckets} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <Settings className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            {missingBuckets.length > 0 && (
              <Button 
                onClick={createDefaultBuckets} 
                size="sm"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Missing Buckets'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

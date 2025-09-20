import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Copy,
  TrendingUp,
  Search,
  Building2
} from 'lucide-react';
import { 
  createCustomerIndexes, 
  checkCustomerIndexStatus, 
  getCustomerIndexSQL 
} from '@/utils/createCustomerIndexes';
import { toast } from 'sonner';

interface OptimizationResult {
  success: boolean;
  message: string;
  details: string[];
  performance_impact?: string;
}

export function CustomerPerformanceOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [indexStatus, setIndexStatus] = useState<{
    hasIndexes: boolean;
    indexCount: number;
    missingIndexes: string[];
  } | null>(null);

  useEffect(() => {
    checkCurrentStatus();
  }, []);

  const checkCurrentStatus = async () => {
    setIsChecking(true);
    try {
      const status = await checkCustomerIndexStatus();
      setIndexStatus(status);
    } catch (error) {
      console.error('Error checking customer index status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setOptimizationResult(null);
    
    try {
      const result = await createCustomerIndexes();
      setOptimizationResult(result);
      
      if (result.success) {
        toast.success('Customer performance optimized!');
        // Re-check status after optimization
        setTimeout(checkCurrentStatus, 1000);
      } else {
        toast.warning('Manual customer optimization required');
      }
    } catch (error: any) {
      toast.error('Customer optimization failed', { description: error.message });
      setOptimizationResult({
        success: false,
        message: 'Customer optimization failed',
        details: [error.message]
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('SQL script copied to clipboard!');
  };

  const getStatusBadge = (optimized: boolean) => {
    return optimized ? (
      <Badge variant="outline" className="text-green-700 border-green-300">
        ⚡ Optimized
      </Badge>
    ) : (
      <Badge variant="outline" className="text-orange-700 border-orange-300">
        🐌 Needs Optimization
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Users className="h-6 w-6 text-blue-500" />
          Customer Performance Optimizer
        </h2>
        <p className="text-muted-foreground">
          Optimize database performance for faster customer loading and search
        </p>
      </div>

      {/* Performance Issues Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Why is customer loading slow?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-red-700">🐌 Current Issues:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Loading all customers at once (no pagination)</li>
                <li>• Database queries without proper indexes</li>
                <li>• Client-side filtering and search</li>
                <li>• No text search optimization</li>
                <li>• Slow customer name/email searches</li>
                <li>• Statement generation fetches unoptimized</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">⚡ Solutions Available:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create database indexes for faster queries</li>
                <li>• Implement pagination (20 customers per page)</li>
                <li>• Server-side search and filtering</li>
                <li>• Trigram indexes for fast text search</li>
                <li>• Optimize customer relationship queries</li>
                <li>• Cache frequently accessed data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      {indexStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Current Customer Database Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Database Performance:</span>
              {getStatusBadge(indexStatus.hasIndexes)}
            </div>
            <div className="flex items-center justify-between">
              <span>Performance Indexes:</span>
              <Badge variant="outline" className={indexStatus.indexCount > 0 ? "text-green-700 border-green-300" : "text-gray-700 border-gray-300"}>
                {indexStatus.indexCount} active
              </Badge>
            </div>
            {indexStatus.missingIndexes.length > 0 && (
              <div className="mt-2 p-3 bg-orange-50 rounded text-sm">
                <strong>Missing Performance Indexes:</strong>
                <ul className="mt-1 list-disc list-inside">
                  {indexStatus.missingIndexes.map((index, i) => (
                    <li key={i} className="text-orange-800">{index}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Impact Estimate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Expected Performance Improvements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-700">Database Queries</h4>
              <p className="text-2xl font-bold text-green-600 mt-2">5-10x</p>
              <p className="text-sm text-green-600">faster with indexes</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-700">Search Speed</h4>
              <p className="text-2xl font-bold text-blue-600 mt-2">15x</p>
              <p className="text-sm text-blue-600">faster name/email search</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-700">Page Load Time</h4>
              <p className="text-2xl font-bold text-purple-600 mt-2">3-5x</p>
              <p className="text-sm text-purple-600">faster with pagination</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button
          onClick={checkCurrentStatus}
          disabled={isChecking || isOptimizing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          {isChecking ? 'Checking...' : 'Check Status'}
        </Button>
        
        <Button
          onClick={handleOptimize}
          disabled={isOptimizing || isChecking}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Users className="h-4 w-4" />
          {isOptimizing ? 'Optimizing...' : 'Optimize Customer Performance'}
        </Button>
      </div>

      {/* Optimization Results */}
      {optimizationResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {optimizationResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
                Customer Optimization Results
              </CardTitle>
              {getStatusBadge(optimizationResult.success)}
            </div>
            <CardDescription>{optimizationResult.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {optimizationResult.details.map((detail, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded text-sm ${
                    detail.startsWith('✅') 
                      ? 'bg-green-50 text-green-800' 
                      : detail.startsWith('❌')
                      ? 'bg-red-50 text-red-800'
                      : detail.startsWith('📋')
                      ? 'bg-yellow-50 text-yellow-800'
                      : detail.startsWith('🎯')
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-gray-50 text-gray-800'
                  }`}
                >
                  <span className="font-mono">{detail}</span>
                </div>
              ))}
            </div>

            {optimizationResult.performance_impact && (
              <Alert className="mt-4">
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Performance Impact:</strong> {optimizationResult.performance_impact}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual SQL Script */}
      {optimizationResult && !optimizationResult.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Manual Customer Optimization Script
            </CardTitle>
            <CardDescription>
              Copy this SQL and run it in Supabase SQL Editor to create customer performance indexes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <strong>Instructions:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Go to your Supabase Dashboard → SQL Editor</li>
                  <li>Create a new query</li>
                  <li>Paste the SQL script below</li>
                  <li>Click "Run" to execute</li>
                  <li>Wait for completion (may take 2-3 minutes)</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="relative">
              <Textarea
                value={getCustomerIndexSQL()}
                readOnly
                className="font-mono text-xs min-h-[300px]"
                placeholder="SQL script will appear here..."
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(getCustomerIndexSQL())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features After Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Features After Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-green-700 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search & Performance:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ⚡ Lightning-fast name/email search</li>
                <li>• ⚡ Instant filtering by status and city</li>
                <li>• ⚡ Fast credit limit filtering</li>
                <li>• ⚡ Paginated customer loading (20 per page)</li>
                <li>• ⚡ Server-side search (no client-side delays)</li>
                <li>• ⚡ Optimized database queries with indexes</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Customer Features:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ⚡ Fast customer statement generation</li>
                <li>• ⚡ Quick invoice and payment lookups</li>
                <li>• ⚡ Responsive customer relationship queries</li>
                <li>• ⚡ Efficient customer statistics</li>
                <li>• ⚡ Smooth scrolling and navigation</li>
                <li>• ⚡ Better user experience overall</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>After Optimization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-700">🔄 Immediate Benefits:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Switch to optimized customers page (/optimized-customers)</li>
                <li>• Use search to find customers instantly</li>
                <li>• Navigate pages quickly with pagination</li>
                <li>• Experience much faster customer operations</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">📊 Long-term Benefits:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Scales well with thousands of customers</li>
                <li>• Reduced server load and costs</li>
                <li>• Better user satisfaction</li>
                <li>• Faster customer relationship management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

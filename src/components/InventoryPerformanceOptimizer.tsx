import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Zap, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Copy,
  TrendingUp
} from 'lucide-react';
import { 
  createInventoryIndexes, 
  checkIndexStatus, 
  getIndexSQL 
} from '@/utils/createInventoryIndexes';
import { toast } from 'sonner';

interface OptimizationResult {
  success: boolean;
  message: string;
  details: string[];
  performance_impact?: string;
}

export function InventoryPerformanceOptimizer() {
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
      const status = await checkIndexStatus();
      setIndexStatus(status);
    } catch (error) {
      console.error('Error checking index status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setOptimizationResult(null);
    
    try {
      const result = await createInventoryIndexes();
      setOptimizationResult(result);
      
      if (result.success) {
        toast.success('Inventory performance optimized!');
        // Re-check status after optimization
        setTimeout(checkCurrentStatus, 1000);
      } else {
        toast.warning('Manual optimization required');
      }
    } catch (error: any) {
      toast.error('Optimization failed', { description: error.message });
      setOptimizationResult({
        success: false,
        message: 'Optimization failed',
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
          <Zap className="h-6 w-6 text-yellow-500" />
          Inventory Performance Optimizer
        </h2>
        <p className="text-muted-foreground">
          Optimize database performance for faster inventory loading
        </p>
      </div>

      {/* Performance Issues Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Why is inventory loading slow?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-red-700">🐌 Current Issues:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Loading all products at once (no pagination)</li>
                <li>• Database queries without proper indexes</li>
                <li>• Expensive JOIN operations with categories</li>
                <li>• No query optimization for filtering</li>
                <li>• Frontend calculations on every render</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">⚡ Solutions Available:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create database indexes for faster queries</li>
                <li>• Implement pagination (20 items per page)</li>
                <li>• Optimize React component rendering</li>
                <li>• Cache frequently accessed data</li>
                <li>• Add search and filter optimizations</li>
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
              Current Database Status
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
              <h4 className="font-semibold text-blue-700">Page Load Time</h4>
              <p className="text-2xl font-bold text-blue-600 mt-2">2-3x</p>
              <p className="text-sm text-blue-600">faster with pagination</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-700">User Experience</h4>
              <p className="text-2xl font-bold text-purple-600 mt-2">Much</p>
              <p className="text-sm text-purple-600">more responsive</p>
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
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
        >
          <Zap className="h-4 w-4" />
          {isOptimizing ? 'Optimizing...' : 'Optimize Performance'}
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
                Optimization Results
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
              Manual Optimization Script
            </CardTitle>
            <CardDescription>
              Copy this SQL and run it in Supabase SQL Editor to create performance indexes
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
                  <li>Wait for completion (may take 1-2 minutes)</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="relative">
              <Textarea
                value={getIndexSQL()}
                readOnly
                className="font-mono text-xs min-h-[300px]"
                placeholder="SQL script will appear here..."
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(getIndexSQL())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Performance Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-700">🔄 After Optimization:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Switch to the optimized inventory page (/optimized-inventory)</li>
                <li>• Use pagination instead of loading all items</li>
                <li>• Apply filters to reduce data load</li>
                <li>• Clear browser cache and reload</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">📊 Monitor Performance:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Watch for improved load times</li>
                <li>• Test search and filter responsiveness</li>
                <li>• Check browser network tab for faster queries</li>
                <li>• Monitor user experience improvements</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

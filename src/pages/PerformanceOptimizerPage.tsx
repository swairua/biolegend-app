import React from 'react';
import { InventoryPerformanceOptimizer } from '@/components/InventoryPerformanceOptimizer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PerformanceOptimizerPage() {
  return (
    <div className="container max-w-6xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-3xl">
            <Zap className="h-8 w-8 text-yellow-500" />
            Inventory Performance Center
          </CardTitle>
          <CardDescription className="text-lg">
            Diagnose and fix slow inventory loading with database optimization and performance improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">🚀 Performance Solutions Available:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Database Optimization:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Create performance indexes for faster queries</li>
                  <li>• Optimize JOIN operations with categories</li>
                  <li>• Enable trigram search for better text filtering</li>
                  <li>• Add composite indexes for common query patterns</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Application Optimization:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Implement pagination (20 items per page)</li>
                  <li>• Add React component memoization</li>
                  <li>• Optimize data transformations and calculations</li>
                  <li>• Cache frequently accessed data</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-4">
              <Link to="/optimized-inventory">
                <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600">
                  Try Optimized Inventory
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <InventoryPerformanceOptimizer />
    </div>
  );
}

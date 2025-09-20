import React from 'react';
import { CustomerPerformanceOptimizer } from '@/components/CustomerPerformanceOptimizer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CustomerPerformanceOptimizerPage() {
  return (
    <div className="container max-w-6xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-3xl">
            <Users className="h-8 w-8 text-blue-500" />
            Customer Performance Center
          </CardTitle>
          <CardDescription className="text-lg">
            Diagnose and fix slow customer loading with database optimization and performance improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Customer Performance Issues Detected</h3>
                <p className="text-blue-800 mb-3">
                  Your customer page is loading slowly because it's fetching all customers at once without 
                  proper database indexes or pagination. This affects search performance and user experience.
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
                  <div>
                    <h4 className="font-medium mb-1">Current problems:</h4>
                    <ul className="space-y-0.5">
                      <li>• Loading all customers simultaneously</li>
                      <li>• Client-side search and filtering</li>
                      <li>• No database indexes for text search</li>
                      <li>• Slow customer relationship queries</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Performance solutions:</h4>
                    <ul className="space-y-0.5">
                      <li>• Server-side pagination (20 customers/page)</li>
                      <li>• Fast trigram text search indexes</li>
                      <li>• Optimized filtering and sorting</li>
                      <li>• Enhanced customer relationship queries</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Link to="/customers">
              <Button variant="outline" className="flex items-center gap-2">
                Current Customers Page
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/optimized-customers">
              <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600">
                Try Optimized Customers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <CustomerPerformanceOptimizer />
    </div>
  );
}

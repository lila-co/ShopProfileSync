
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  MemoryStick, 
  RefreshCw,
  Trash2,
  TrendingUp,
  Users,
  XCircle
} from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  timestamp: string;
  metrics: {
    uptime: number;
    memoryUsage: any;
    activeRequests: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

interface MetricsData {
  system: any;
  metrics: Record<string, any>;
  errors: {
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    topErrors: Array<{ fingerprint: string; message: string; count: number; severity: string }>;
    recentErrors: number;
  };
  timeframe: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
  requestId?: string;
}

interface ErrorReport {
  id: string;
  message: string;
  timestamp: string;
  severity: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function MonitoringDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');

  const { data: healthData, refetch: refetchHealth } = useQuery<HealthStatus>({
    queryKey: ['/api/admin/health'],
    refetchInterval: 900000, // Refresh every 15 minutes
    staleTime: 600000, // Consider data fresh for 10 minutes
  });

  const { data: metricsData, refetch: refetchMetrics } = useQuery<MetricsData>({
    queryKey: ['/api/admin/metrics'],
    refetchInterval: 1800000, // Refresh every 30 minutes
    staleTime: 900000, // Consider data fresh for 15 minutes
  });

  const { data: logsData, refetch: refetchLogs } = useQuery<LogEntry[]>({
    queryKey: ['/api/admin/logs', { limit: 100 }],
    refetchInterval: false, // Only refresh manually
    staleTime: 300000, // Consider data fresh for 5 minutes
  });

  const { data: errorsData, refetch: refetchErrors } = useQuery<{ reports: ErrorReport[]; stats: any }>({
    queryKey: ['/api/admin/errors'],
    refetchInterval: 1800000, // Refresh every 30 minutes
    staleTime: 900000, // Consider data fresh for 15 minutes
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const refreshAll = () => {
    refetchHealth();
    refetchMetrics();
    refetchLogs();
    refetchErrors();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-gray-600">Real-time system health and performance metrics</p>
        </div>
        <Button onClick={refreshAll} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* System Health Overview */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                {getStatusIcon(healthData.status)}
                <span className="ml-2">System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${getStatusColor(healthData.status)}`}>
                {healthData.status.toUpperCase()}
              </p>
              {healthData.issues.length > 0 && (
                <div className="mt-2">
                  {healthData.issues.map((issue, index) => (
                    <Badge key={index} variant="destructive" className="text-xs mr-1">
                      {issue}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatUptime(healthData.metrics.uptime)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <MemoryStick className="w-4 h-4 mr-2" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatBytes(healthData.metrics.memoryUsage.heapUsed)}
              </p>
              <p className="text-xs text-gray-500">
                / {formatBytes(healthData.metrics.memoryUsage.heapTotal)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Active Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{healthData.metrics.activeRequests}</p>
              <p className="text-xs text-gray-500">
                {healthData.metrics.totalRequests} total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {metricsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Error Rate:</span>
                    <span className={metricsData.system.errorRate > 5 ? 'text-red-600' : 'text-green-600'}>
                      {metricsData.system.errorRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Response Time:</span>
                    <span>{metricsData.system.averageResponseTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Requests:</span>
                    <span>{metricsData.system.totalRequests.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>RSS Memory:</span>
                    <span>{formatBytes(metricsData.system.memoryUsage.rss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heap Used:</span>
                    <span>{formatBytes(metricsData.system.memoryUsage.heapUsed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU Usage:</span>
                    <span>{((metricsData.system.cpuUsage.user + metricsData.system.cpuUsage.system) / 1000).toFixed(1)}ms</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Error Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Errors:</span>
                    <span className="text-red-600">{metricsData.errors.totalErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recent (1h):</span>
                    <span>{metricsData.errors.recentErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Critical:</span>
                    <span className="text-red-600">{metricsData.errors.errorsBySeverity.critical}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metricsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(metricsData.metrics).map(([name, metric]: [string, any]) => (
                <Card key={name}>
                  <CardHeader>
                    <CardTitle className="text-sm capitalize">
                      {name.replace(/_/g, ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Count:</span>
                        <span>{metric.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average:</span>
                        <span>{metric.avg.toFixed(2)} {metric.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Min/Max:</span>
                        <span>{metric.min.toFixed(2)} / {metric.max.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          {errorsData && (
            <>
              {errorsData.stats.topErrors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Errors</CardTitle>
                    <CardDescription>Most frequent errors in the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {errorsData.stats.topErrors.map((error) => (
                        <div key={error.fingerprint} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{error.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getSeverityColor(error.severity)}>
                                {error.severity}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Count: {error.count}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Clear specific error
                              fetch(`/api/admin/errors/${error.fingerprint}`, { method: 'DELETE' })
                                .then(() => refetchErrors());
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">All Error Reports</h3>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    fetch('/api/admin/errors', { method: 'DELETE' })
                      .then(() => refetchErrors());
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>

              <div className="space-y-2">
                {errorsData.reports.map((error) => (
                  <Card key={error.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{error.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Count: {error.count}
                            </span>
                            <span className="text-xs text-gray-500">
                              Last seen: {new Date(error.lastSeen).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            fetch(`/api/admin/errors/${error.id}`, { method: 'DELETE' })
                              .then(() => refetchErrors());
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {logsData && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Logs</CardTitle>
                <CardDescription>Latest system logs and events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logsData.map((log, index) => (
                    <div key={index} className="text-xs border-b pb-2 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'}>
                          {log.level}
                        </Badge>
                        {log.requestId && (
                          <span className="text-xs text-gray-400">
                            {log.requestId}
                          </span>
                        )}
                      </div>
                      <p className="mt-1">{log.message}</p>
                      {log.metadata && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-gray-500">
                            Show metadata
                          </summary>
                          <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

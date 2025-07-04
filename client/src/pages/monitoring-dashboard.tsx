
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription } from './components/ui/alert';
import { Progress } from './components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  ArrowLeft,
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  MemoryStick, 
  RefreshCw,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BottomNavigation from './components/layout/BottomNavigation';

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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logFilter, setLogFilter] = useState('');
  const [, navigate] = useLocation();

  // Health data with auto-refresh
  const { data: healthData, refetch: refetchHealth, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ['/api/admin/health'],
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
    staleTime: 15000, // Consider fresh for 15 seconds
  });

  // Metrics data with less frequent refresh
  const { data: metricsData, refetch: refetchMetrics, isLoading: metricsLoading } = useQuery<MetricsData>({
    queryKey: ['/api/admin/metrics'],
    refetchInterval: autoRefresh ? 60000 : false, // 1 minute
    staleTime: 30000, // Consider fresh for 30 seconds
  });

  // Logs data - manual refresh only
  const { data: logsData, refetch: refetchLogs, isLoading: logsLoading } = useQuery<LogEntry[]>({
    queryKey: ['/api/admin/logs', { limit: 100 }],
    refetchInterval: false,
    staleTime: 300000, // Consider fresh for 5 minutes
  });

  // Error data with moderate refresh
  const { data: errorsData, refetch: refetchErrors, isLoading: errorsLoading } = useQuery<{ reports: ErrorReport[]; stats: any }>({
    queryKey: ['/api/admin/errors'],
    refetchInterval: autoRefresh ? 120000 : false, // 2 minutes
    staleTime: 60000, // Consider fresh for 1 minute
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

  const exportLogs = () => {
    if (!logsData) return;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Timestamp,Level,Message,Request ID\n"
      + logsData.map(log => 
          `"${log.timestamp}","${log.level}","${log.message.replace(/"/g, '""')}","${log.requestId || ''}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate mock performance chart data
  const generatePerformanceData = () => {
    const data = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseTime: Math.floor(Math.random() * 200) + 100,
        memory: Math.floor(Math.random() * 30) + 40,
        cpu: Math.floor(Math.random() * 25) + 10,
        requests: Math.floor(Math.random() * 1000) + 500
      });
    }
    return data;
  };

  const performanceData = generatePerformanceData();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="space-y-4">
        {/* Mobile-first header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/admin-profile')}
            className="flex items-center shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          
          {/* Mobile controls - icons only */}
          <div className="flex items-center space-x-1 sm:hidden">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="px-2"
            >
              <Activity className="w-4 h-4" />
            </Button>
            <Button onClick={refreshAll} variant="outline" size="sm" className="px-2">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Desktop controls - full labels */}
          <div className="hidden sm:flex items-center space-x-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className="w-4 h-4 mr-2" />
              Auto Refresh {autoRefresh ? 'On' : 'Off'}
            </Button>
            <Button onClick={refreshAll} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </div>

        {/* Title section */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold">System Monitoring</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Real-time system health and performance metrics
          </p>
        </div>

        {/* Mobile status indicators */}
        <div className="sm:hidden flex items-center justify-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-gray-600">
              Auto Refresh {autoRefresh ? 'On' : 'Off'}
            </span>
          </div>
        </div>
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
                    <Badge key={index} variant="destructive" className="text-xs mr-1 mb-1 block">
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
              <p className="text-xs text-gray-500 mt-1">
                Since last restart
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
              <Progress 
                value={(healthData.metrics.memoryUsage.heapUsed / healthData.metrics.memoryUsage.heapTotal) * 100} 
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Request Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{healthData.metrics.activeRequests}</p>
              <p className="text-xs text-gray-500">
                Active ({healthData.metrics.totalRequests} total)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {healthData.metrics.errorRate.toFixed(1)}% error rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Response Time (Last 24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="responseTime" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Memory & CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="memory" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="cpu" stackId="2" stroke="#ffc658" fill="#ffc658" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {metricsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Summary</CardTitle>
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
                    <span className="text-red-600">{metricsData.errors.errorsBySeverity.critical || 0}</span>
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
                    <CardTitle className="text-sm capitalize flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {name.replace(/_/g, ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Count:</span>
                        <span className="font-mono">{metric.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average:</span>
                        <span className="font-mono">{metric.avg.toFixed(2)} {metric.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Min/Max:</span>
                        <span className="font-mono">{metric.min.toFixed(2)} / {metric.max.toFixed(2)}</span>
                      </div>
                      <Progress value={(metric.avg / metric.max) * 100} className="mt-2 h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Database Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    fetch('/api/admin/database/backup', { method: 'POST' })
                      .then(() => refreshAll());
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Backup Database
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    fetch('/api/admin/cache/clear', { method: 'POST' })
                      .then(() => refreshAll());
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cache
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    fetch('/api/admin/database/optimize', { method: 'POST' })
                      .then(() => refreshAll());
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Optimize Tables
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Connection Pool:</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Connections:</span>
                    <span className="font-mono">12/50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Query Performance:</span>
                    <span className="font-mono">~45ms avg</span>
                  </div>
                  <Progress value={24} className="mt-2 h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Database Metrics</CardTitle>
              <CardDescription>Real-time database performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="responseTime" stroke="#8884d8" strokeWidth={2} name="Query Time (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          {errorsData && (
            <>
              {errorsData.stats.topErrors && errorsData.stats.topErrors.length > 0 && (
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
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={refetchLogs}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {logsData && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Logs</CardTitle>
                <CardDescription>Latest system logs and events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logsData
                    .filter(log => 
                      !logFilter || 
                      log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
                      log.level.toLowerCase().includes(logFilter.toLowerCase())
                    )
                    .map((log, index) => (
                    <div key={index} className="text-xs border-b pb-2 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'secondary' : 'default'}>
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
      <BottomNavigation activeTab="admin" />
    </div>
  );
}

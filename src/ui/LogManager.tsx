/**
 * Log Manager UI Component
 * 提供日志查看、导出和管理功能
 */

import React, { useState, useEffect } from 'react';
import { FileLogger } from '../utils/fileLogger';
import { Button, Card, Typography, Space, Alert, Progress, Tag, Statistic, Row, Col } from 'antd';
import { 
  DownloadOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  BugOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface LogStats {
  totalFiles: number;
  totalSize: number;
  oldestLog: Date | null;
  newestLog: Date | null;
}

interface LogManagerProps {
  fileLogger: FileLogger;
  isDevelopment?: boolean;
}

export const LogManager: React.FC<LogManagerProps> = ({ fileLogger, isDevelopment = false }) => {
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 加载日志统计信息
  const loadStats = async () => {
    setLoading(true);
    try {
      const logStats = await fileLogger.getLogStats();
      setStats(logStats);
    } catch (error) {
      console.error('Failed to load log stats:', error);
      setMessage({ type: 'error', text: '加载日志统计信息失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // 导出日志
  const handleExportLogs = async () => {
    setExporting(true);
    setMessage(null);
    
    try {
      const blob = await fileLogger.exportLogs();
      
      if (blob) {
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `z2r-logs-${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setMessage({ type: 'success', text: '日志导出成功' });
      } else {
        setMessage({ type: 'error', text: '日志导出失败' });
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      setMessage({ type: 'error', text: `导出失败: ${error.message}` });
    } finally {
      setExporting(false);
    }
  };

  // 清理旧日志
  const handleCleanOldLogs = async () => {
    setCleaning(true);
    setMessage(null);
    
    try {
      await fileLogger.cleanOldLogs(7); // 清理7天前的日志
      setMessage({ type: 'success', text: '已清理7天前的旧日志' });
      await loadStats(); // 重新加载统计信息
    } catch (error) {
      console.error('Failed to clean old logs:', error);
      setMessage({ type: 'error', text: `清理失败: ${error.message}` });
    } finally {
      setCleaning(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  // 格式化日期
  const formatDate = (date: Date | null): string => {
    if (!date) return '无';
    return new Date(date).toLocaleString();
  };

  return (
    <Card 
      title={
        <Space>
          <FileTextOutlined />
          <span>日志管理</span>
          {isDevelopment && <Tag color="orange" icon={<BugOutlined />}>开发模式</Tag>}
        </Space>
      }
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          onClick={loadStats}
          loading={loading}
          size="small"
        >
          刷新
        </Button>
      }
    >
      {/* 统计信息 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic 
              title="日志文件数" 
              value={stats.totalFiles}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="总大小" 
              value={formatFileSize(stats.totalSize)}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="最早日志" 
              value={formatDate(stats.oldestLog)}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="最新日志" 
              value={formatDate(stats.newestLog)}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
        </Row>
      )}

      {/* 消息提示 */}
      {message && (
        <Alert
          message={message.text}
          type={message.type}
          showIcon
          closable
          onClose={() => setMessage(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 开发模式提示 */}
      {isDevelopment && (
        <Alert
          message="开发模式已启用"
          description="当前处于开发模式，将记录更详细的调试信息。日志文件中包含完整的调用栈和调试跟踪。"
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 操作按钮 */}
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" type="inner" title="日志导出">
          <Paragraph>
            <Text type="secondary">
              导出所有日志文件为压缩包，包含系统信息和配置信息（已脱敏）。
              适用于问题诊断和技术支持。
            </Text>
          </Paragraph>
          <Button 
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportLogs}
            loading={exporting}
            block
          >
            导出日志包
          </Button>
        </Card>

        <Card size="small" type="inner" title="日志清理">
          <Paragraph>
            <Text type="secondary">
              自动清理超过7天的旧日志文件，释放存储空间。
              重要日志请先导出备份。
            </Text>
          </Paragraph>
          <Button 
            danger
            icon={<DeleteOutlined />}
            onClick={handleCleanOldLogs}
            loading={cleaning}
            block
          >
            清理旧日志
          </Button>
        </Card>

        {/* 日志配置说明 */}
        <Card size="small" type="inner" title="日志配置">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>日志文件位置：</Text>
              <Text code>Zotero数据目录/logs/z2r/</Text>
            </div>
            <div>
              <Text strong>日志轮转：</Text>
              <Text>单个文件最大10MB，最多保留5个文件</Text>
            </div>
            <div>
              <Text strong>日志级别：</Text>
              <Space>
                <Tag color="default">DEBUG</Tag>
                <Tag color="blue">INFO</Tag>
                <Tag color="orange">WARN</Tag>
                <Tag color="red">ERROR</Tag>
              </Space>
            </div>
            <div>
              <Text strong>当前模式：</Text>
              <Tag color={isDevelopment ? 'orange' : 'green'}>
                {isDevelopment ? '开发模式 (详细日志)' : '生产模式 (标准日志)'}
              </Tag>
            </div>
          </Space>
        </Card>
      </Space>
    </Card>
  );
};

export default LogManager;

/**
 * Test Deep Links for Zotero Annotations
 * 测试深链回跳功能
 */

import { ZoteroToReadwiseMapper } from '../mappers/zoteroToReadwise';
import { ItemWithAnnotations, ZoteroItem, ZoteroAnnotation } from '../adapters/zoteroAdapter/types';
import { Logger } from '../utils/logger';

// 创建测试数据
function createTestData(): ItemWithAnnotations {
  const testItem: ZoteroItem = {
    id: 'TEST123',
    key: 'ABCD1234',
    type: 'journalArticle',
    title: 'Test Article for Deep Links',
    authors: ['John Doe', 'Jane Smith'],
    publicationTitle: 'Test Journal',
    date: '2024',
    doi: '10.1234/test',
    isbn: '',
    url: 'https://example.com/article',
    abstractNote: 'This is a test article',
    tags: ['test', 'deep-links'],
    collections: [],
    dateAdded: new Date(),
    dateModified: new Date(),
    extra: '',
    libraryId: 1,
    version: 1
  };

  const testAnnotations: ZoteroAnnotation[] = [
    {
      // PDF高亮注释
      id: '1:ANNOT001',
      type: 'highlight',
      text: 'This is a highlighted text from PDF',
      comment: 'My comment on this highlight',
      color: '#ffd400',
      pageNumber: 5,
      sortIndex: 1,
      dateCreated: new Date(),
      dateModified: new Date(),
      tags: ['important'],
      itemId: 'TEST123',
      attachmentId: '1:ATTACH001', // PDF附件ID
      position: {
        pageIndex: 4,
        rects: [[100, 200, 300, 220]]
      }
    },
    {
      // 纯文字笔记（没有附件）
      id: '1:NOTE001',
      type: 'note',
      text: '',
      comment: 'This is a standalone note without attachment',
      color: '',
      pageNumber: 0,
      sortIndex: 2,
      dateCreated: new Date(),
      dateModified: new Date(),
      tags: ['note'],
      itemId: 'TEST123',
      attachmentId: '', // 无附件
      position: undefined
    },
    {
      // 另一个PDF注释
      id: '1:ANNOT002',
      type: 'underline',
      text: 'Underlined text in PDF',
      comment: 'Another annotation',
      color: '#2ea8e5',
      pageNumber: 10,
      sortIndex: 3,
      dateCreated: new Date(),
      dateModified: new Date(),
      tags: [],
      itemId: 'TEST123',
      attachmentId: '1:ATTACH001',
      position: {
        pageIndex: 9,
        rects: [[150, 300, 400, 320]]
      }
    }
  ];

  return {
    item: testItem,
    annotations: testAnnotations,
    attachments: []
  };
}

// 测试深链生成
export async function testDeepLinks() {
  console.log('=== Testing Deep Link Generation ===\n');
  
  const logger = new Logger('TestDeepLinks');
  const mapper = new ZoteroToReadwiseMapper(logger, {
    includeDeepLinks: true,
    normalizeText: false // 保持原始格式以便查看
  });

  const testData = createTestData();
  const result = await mapper.mapItem(testData);

  if (!result) {
    console.error('Failed to map test data');
    return;
  }

  console.log('Book:', result.book.title);
  console.log('Total highlights:', result.highlights.length);
  console.log('\n--- Generated Deep Links ---\n');

  result.highlights.forEach((highlight, index) => {
    console.log(`Highlight ${index + 1}:`);
    console.log(`  Text: "${highlight.text?.substring(0, 50)}..."`);
    
    // 提取深链
    const noteContent = highlight.note || '';
    const deepLinkMatch = noteContent.match(/Open in Zotero: (zotero:\/\/[^\s]+)/);
    
    if (deepLinkMatch) {
      const deepLink = deepLinkMatch[1];
      console.log(`  Deep Link: ${deepLink}`);
      
      // 解析链接类型
      if (deepLink.includes('open-pdf')) {
        console.log(`  Type: Open PDF with annotation`);
        const itemKey = deepLink.match(/items\/([^?]+)/)?.[1];
        const annotKey = deepLink.match(/annotation=([^&]+)/)?.[1];
        console.log(`    PDF Key: ${itemKey}`);
        console.log(`    Annotation Key: ${annotKey}`);
      } else if (deepLink.includes('select')) {
        console.log(`  Type: Select parent item`);
        const itemKey = deepLink.match(/items\/([^?]+)/)?.[1];
        console.log(`    Item Key: ${itemKey}`);
      }
    } else {
      console.log(`  Deep Link: Not found`);
    }
    console.log('');
  });

  console.log('\n--- Expected Links ---');
  console.log('1. PDF Highlight: zotero://open-pdf/library/items/ATTACH001?annotation=ANNOT001');
  console.log('2. Standalone Note: zotero://select/library/items/ABCD1234');
  console.log('3. PDF Underline: zotero://open-pdf/library/items/ATTACH001?annotation=ANNOT002');
  
  return result;
}

// 如果直接运行此文件
if (require.main === module) {
  testDeepLinks().then(() => {
    console.log('\nTest completed!');
  }).catch(error => {
    console.error('Test failed:', error);
  });
}

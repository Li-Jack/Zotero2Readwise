#!/bin/bash
echo "启动Zotero调试模式..."
/Applications/Zotero.app/Contents/MacOS/zotero -purgecaches -ZoteroDebugText -jsconsole "$@"

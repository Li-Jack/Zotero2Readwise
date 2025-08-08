# Instructions for Creating GitHub Release v1.2.1

## Prerequisites Completed ✅

1. ✅ All code changes committed
2. ✅ Version bumped to 1.2.1 in manifest.json
3. ✅ Git tag `v1.2.1-prefs-fix` created
4. ✅ zotero2readwise.xpi built with latest changes
5. ✅ Release notes prepared (RELEASE_NOTES_v1.2.1.md)
6. ✅ README.md updated with latest version info

## Steps to Complete the GitHub Release

### 1. Push Changes to GitHub

Since the remote repository appears to be inaccessible from command line, you may need to:

1. Check if you have the correct repository permissions
2. If this is your fork, ensure it exists at: https://github.com/Li-Jack/Zotero2Readwise
3. If you want to push to the original repo, update the remote:
   ```bash
   git remote set-url origin https://github.com/e-alizadeh/Zotero2Readwise.git
   ```

Then push the changes:
```bash
# Push commits
git push origin main

# Push the tag
git push origin v1.2.1-prefs-fix
```

### 2. Create GitHub Release

1. Go to your repository on GitHub
2. Click on "Releases" (right side of the page)
3. Click "Draft a new release"
4. Fill in the release details:
   - **Choose a tag**: Select `v1.2.1-prefs-fix` (or create it if not pushed)
   - **Release title**: `v1.2.1 - Preferences Fix`
   - **Description**: Copy the contents from `RELEASE_NOTES_v1.2.1.md`
   - **Attach binaries**: 
     - Click "Attach binaries by dropping them here or selecting them"
     - Upload the `zotero2readwise.xpi` file (92.7 KB)
   - **Set as pre-release**: Leave unchecked (this is a stable release)
   - **Set as latest release**: Check this box

5. Click "Publish release"

### 3. Update the updates.json (Optional - for auto-updates)

If you maintain an updates.json file for automatic updates, update it with:

```json
{
  "addons": {
    "zotero2readwise@ealizadeh.com": {
      "updates": [
        {
          "version": "1.2.1",
          "update_link": "https://github.com/[your-username]/Zotero2Readwise/releases/download/v1.2.1-prefs-fix/zotero2readwise.xpi",
          "applications": {
            "zotero": {
              "strict_min_version": "7.0"
            }
          }
        }
      ]
    }
  }
}
```

### 4. Submit to Zotero Add-ons Repository (Optional)

If you want to submit to the official Zotero Add-ons repository:

1. Go to https://www.zotero.org/support/dev/zotero_7_for_developers#submitting_plugins_to_the_zotero_add-ons_directory
2. Follow the submission guidelines
3. Upload the `zotero2readwise.xpi` file
4. Provide the following information:
   - Version: 1.2.1
   - Compatibility: Zotero 7.0+
   - Description: Export your Zotero annotations and notes to Readwise
   - Changes in this version: Fixed preferences persistence issues in Zotero 7

## Files Ready for Release

- ✅ `zotero2readwise.xpi` - The plugin file (92.7 KB)
- ✅ `RELEASE_NOTES_v1.2.1.md` - Release notes for GitHub
- ✅ Updated `README.md` with v1.2.1 information

## Post-Release Checklist

- [ ] Verify the .xpi file can be downloaded from the release page
- [ ] Test installation on a clean Zotero 7 instance
- [ ] Update any documentation or wiki pages
- [ ] Announce the release to users (if applicable)
- [ ] Monitor for any bug reports related to the new version

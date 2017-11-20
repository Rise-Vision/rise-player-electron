# Prerequisites

- 7zip extra: http://www.7-zip.org/download.html (current: http://www.7-zip.org/a/7z920_extra.7z)
- ResEdit: http://www.resedit.net
- Microsoft Windows SDK 7.0: https://www.microsoft.com/en-us/download/details.aspx?id=3138

# Instructions

These steps should not be required to be performed again, it's just a reference of what was done. The source of this procedure is: http://www.excelsiorjet.com/kb/35/howto-create-a-single-exe-from-your-java-application

- Copy 7zS.sfx to the external-deps directory
- Rename 7zS.sfx to 7zS.exe (ResEdit will not find the file otherwise)
- Click on "File/Add a resource.../Manifest". Use the provided **manifest.xml** file (attached below for reference).
- Click on "File/Add a resource.../Icon". Choose Rise Vision's icon.
- Remove the default icon.
- Modify the copyright strings in "Version Information"
- Save and rename 7zS.exe back to 7zS.sfx

## Manifest XML

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <description>Rise Vision Player</description>
  <dependency>
    <dependentAssembly>
      <assemblyIdentity type="win32" name="Microsoft.Windows.Common-Controls" version="6.0.0.0" processorArchitecture="*" publicKeyToken="6595b64144ccf1df" language="*"/>
    </dependentAssembly>
  </dependency>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="asInvoker" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
  <application xmlns="urn:schemas-microsoft-com:asm.v3">
    <windowsSettings>
      <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">True</dpiAware>
    </windowsSettings>
  </application>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1"> 
    <application> 
      <!-- Windows 10 --> 
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
      <!-- Windows 8.1 -->
      <supportedOS Id="{1f676c76-80e1-4239-95bb-83d0f6d0da78}"/>
      <!-- Windows 8 -->
      <supportedOS Id="{4a2f28e3-53b9-4441-ba9c-d69d4a4a6e38}"/>
      <!-- Windows 7 -->
      <supportedOS Id="{35138b9a-5d96-4fbd-8e2d-a2440225f93a}"/>
      <!-- Windows Vista -->
      <supportedOS Id="{e2011457-1546-43c5-a5fe-008deee3d3f0}"/> 
    </application> 
  </compatibility>
</assembly>
```

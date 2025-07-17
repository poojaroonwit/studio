"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AutoFont, useAutoFont } from '@/components/ui/auto-font';
import { containsThaiText, getFontClass } from '@/lib/utils';
import { 
  Type, 
  Globe, 
  Languages, 
  Copy,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const englishSampleText = `Welcome to CandiTrack - Professional Recruitment Management System

This is a comprehensive platform for tracking candidates, positions, and hiring processes. Our system provides:

• Advanced candidate matching algorithms
• Automated resume parsing and analysis
• Real-time collaboration tools
• Comprehensive reporting and analytics
• Multi-language support with intelligent font switching

Experience the future of recruitment management with our cutting-edge technology.`;

const thaiSampleText = `ยินดีต้อนรับสู่ CandiTrack - ระบบจัดการการสรรหาบุคลากรระดับมืออาชีพ

นี่คือแพลตฟอร์มที่ครอบคลุมสำหรับการติดตามผู้สมัคร ตำแหน่งงาน และกระบวนการจ้างงาน ระบบของเรามี:

• อัลกอริทึมการจับคู่ผู้สมัครขั้นสูง
• การวิเคราะห์และแยกวิเคราะห์เรซูเม่อัตโนมัติ
• เครื่องมือการทำงานร่วมกันแบบเรียลไทม์
• การรายงานและการวิเคราะห์ที่ครอบคลุม
• การรองรับหลายภาษาโดยมีการเปลี่ยนฟอนต์อัตโนมัติ

สัมผัสประสบการณ์อนาคตของการจัดการการสรรหาบุคลากรด้วยเทคโนโลยีล้ำสมัยของเรา`;

const mixedSampleText = `Welcome to CandiTrack - ระบบจัดการการสรรหาบุคลากร

This system provides both English and Thai language support with automatic font switching.
ระบบนี้รองรับทั้งภาษาอังกฤษและภาษาไทยพร้อมการเปลี่ยนฟอนต์อัตโนมัติ

Features include:
คุณสมบัติรวมถึง:
• Candidate Management การจัดการผู้สมัคร
• Resume Parsing การแยกวิเคราะห์เรซูเม่
• Real-time Updates การอัปเดตแบบเรียลไทม์`;

export default function FontDemoPage() {
  const [customText, setCustomText] = useState('');
  const [textareaText, setTextareaText] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Text copied to clipboard!');
  };

  const detectLanguage = (text: string) => {
    if (!text) return 'No text';
    const hasThai = containsThaiText(text);
    const hasEnglish = /[a-zA-Z]/.test(text);
    
    if (hasThai && hasEnglish) return 'Mixed (Thai + English)';
    if (hasThai) return 'Thai';
    if (hasEnglish) return 'English';
    return 'Other';
  };

  const getFontClassForText = (text: string) => {
    return getFontClass(text);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Font Demo - Inter & Anuphan</h1>
        <p className="text-muted-foreground">Showcasing automatic font switching between Inter (English) and Anuphan (Thai)</p>
      </div>

      {/* Font Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Font Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold font-inter">Inter Font (English)</h3>
              <p className="text-sm text-muted-foreground">
                Modern, highly legible font designed for computer screens. 
                Optimized for user interfaces and digital content.
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="font-inter">Regular</Badge>
                <Badge variant="outline" className="font-inter font-medium">Medium</Badge>
                <Badge variant="outline" className="font-inter font-semibold">Semibold</Badge>
                <Badge variant="outline" className="font-inter font-bold">Bold</Badge>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold font-anuphan">Anuphan Font (Thai)</h3>
              <p className="text-sm text-muted-foreground font-anuphan">
                ฟอนต์ที่ทันสมัยและอ่านง่ายออกแบบมาสำหรับหน้าจอคอมพิวเตอร์ 
                ปรับให้เหมาะสำหรับส่วนติดต่อผู้ใช้และเนื้อหาดิจิทัล
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="font-anuphan">ปกติ</Badge>
                <Badge variant="outline" className="font-anuphan font-medium">กลาง</Badge>
                <Badge variant="outline" className="font-anuphan font-semibold">กึ่งหนา</Badge>
                <Badge variant="outline" className="font-anuphan font-bold">หนา</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Texts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* English Sample */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-500" />
              English Text
            </CardTitle>
            <Badge variant="secondary" className="w-fit">Inter Font</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <AutoFont className="text-sm leading-relaxed">
                  {englishSampleText}
                </AutoFont>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(englishSampleText)}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Text
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Thai Sample */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-purple-500" />
              Thai Text
            </CardTitle>
            <Badge variant="secondary" className="w-fit font-anuphan">Anuphan Font</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <AutoFont className="text-sm leading-relaxed">
                  {thaiSampleText}
                </AutoFont>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(thaiSampleText)}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Text
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mixed Sample */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5 text-orange-500" />
              Mixed Text
            </CardTitle>
            <Badge variant="secondary" className="w-fit">Auto Font</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <AutoFont className="text-sm leading-relaxed">
                  {mixedSampleText}
                </AutoFont>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(mixedSampleText)}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Text
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Interactive Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Interactive Font Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-text">Enter text to test font detection:</Label>
            <Input
              id="custom-text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Type English, Thai, or mixed text here..."
              className="font-auto"
            />
            <div className="flex gap-2 text-sm">
              <Badge variant="outline">
                Language: {detectLanguage(customText)}
              </Badge>
              <Badge variant="outline">
                Font: {getFontClassForText(customText)}
              </Badge>
            </div>
          </div>

          {/* Preview */}
          {customText && (
            <div className="space-y-2">
              <Label>Preview:</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <AutoFont className="text-base">
                  {customText}
                </AutoFont>
              </div>
            </div>
          )}

          {/* Textarea */}
          <div className="space-y-2">
            <Label htmlFor="textarea-text">Multi-line text area:</Label>
            <Textarea
              id="textarea-text"
              value={textareaText}
              onChange={(e) => setTextareaText(e.target.value)}
              placeholder="Enter multi-line text here...\n\nYou can mix English and Thai text.\nคุณสามารถผสมภาษาอังกฤษและภาษาไทยได้"
              className="font-auto min-h-[120px]"
            />
            <div className="flex gap-2 text-sm">
              <Badge variant="outline">
                Language: {detectLanguage(textareaText)}
              </Badge>
              <Badge variant="outline">
                Font: {getFontClassForText(textareaText)}
              </Badge>
            </div>
          </div>

          {/* Textarea Preview */}
          {textareaText && (
            <div className="space-y-2">
              <Label>Textarea Preview:</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <AutoFont className="text-base whitespace-pre-wrap">
                  {textareaText}
                </AutoFont>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Usage Examples
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">CSS Classes</h4>
                <div className="space-y-1 text-sm">
                  <code className="bg-muted px-2 py-1 rounded">font-inter</code>
                  <code className="bg-muted px-2 py-1 rounded">font-anuphan</code>
                  <code className="bg-muted px-2 py-1 rounded">font-auto</code>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Utility Functions</h4>
                <div className="space-y-1 text-sm">
                  <code className="bg-muted px-2 py-1 rounded">containsThaiText(text)</code>
                  <code className="bg-muted px-2 py-1 rounded">getFontClass(text)</code>
                  <code className="bg-muted px-2 py-1 rounded">useAutoFont(text)</code>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-semibold">AutoFont Component</h4>
              <div className="bg-muted p-3 rounded text-sm">
                <code>{`<AutoFont>Your text here</AutoFont>`}</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
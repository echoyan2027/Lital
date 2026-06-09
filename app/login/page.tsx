'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的11位手机号');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('phone-auth', {
        body: { action: 'send', phone },
      });

      if (error) {
        // supabase-js wraps non-2xx as an error; extract message
        const msg = error.message || '发送验证码失败';
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || '验证码已发送');
      setStep('code');
    } catch (err: any) {
      toast.error(err.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length < 4) {
      toast.error('请输入验证码');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('phone-auth', {
        body: { action: 'verify', phone, code },
      });

      if (error) {
        const msg = error.message || '验证失败';
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      if (data?.access_token && data?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) throw sessionError;
        toast.success('登录成功');
        router.replace('/report');
      } else {
        toast.error('登录失败，未获取到会话，请联系管理员');
      }
    } catch (err: any) {
      toast.error(err.message || '验证失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7H3l2-4h14l2 4M5 21V10.87M19 21V10.87" />
            </svg>
          </div>
          <CardTitle className="text-xl">利塔尔项目管理</CardTitle>
          <CardDescription>使用手机号验证码登录</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入11位手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSendCode}
                disabled={loading}
              >
                {loading ? '发送中...' : '获取验证码'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="请输入6位验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                />
              </div>

              {/* Dev-mode hint */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-sm font-medium text-blue-800">
                  开发模式验证码：<span className="text-lg font-bold tracking-widest">123456</span>
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  请输入上方固定验证码完成登录
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleVerify}
                disabled={loading}
              >
                {loading ? '验证中...' : '登录'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('phone')}
              >
                返回修改手机号
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
